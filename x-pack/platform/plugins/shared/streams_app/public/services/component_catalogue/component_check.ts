/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/server-route-repository-client';
import type {
  ComponentValidationRequest,
  ComponentValidationResult,
  StreamsUnit,
} from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { getFormattedError } from '../../util/errors';

/** The raw round trip to `POST /internal/streams/components/_validate`. */
export type ComponentCheckFetch = (
  request: ComponentValidationRequest,
  signal?: AbortSignal
) => Promise<ComponentValidationResult>;

/** How a component check turned out, for an editor deciding whether to commit. */
export type ComponentCheck =
  | { status: 'valid'; diagnostics: StreamsUnit.Diagnostic[] }
  | { status: 'invalid'; diagnostics: StreamsUnit.Diagnostic[] }
  /** The configuration service could not be reached; the unit save still validates everything. */
  | { status: 'unchecked' }
  | { status: 'failed'; message: string };

/** Checks one component against its catalogue definition, before any unit holds it. */
export type ComponentChecker = (
  request: ComponentValidationRequest,
  signal?: AbortSignal
) => Promise<ComponentCheck>;

// Kibana answers 502 when the distributor failed or rejected its certificate, 503 when it is not
// configured, and a proxy in front of Kibana answers 504 when Kibana itself timed out. Anything
// else, such as a rejected request, is a real error to show.
const UNREACHABLE_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

// `code` is required on a diagnostic; an empty one means "no code", and the editor hides it.
const rejectedWithoutDetails: StreamsUnit.Diagnostic = {
  severity: 'error',
  code: '',
  message: i18n.translate('xpack.streams.componentValidation.rejectedWithoutDetails', {
    defaultMessage: 'The configuration service rejected this configuration without details.',
  }),
};

/** Turns the raw round trip into a checker that reports every outcome as a `ComponentCheck`. */
export const toComponentChecker =
  (fetchCheck: ComponentCheckFetch): ComponentChecker =>
  async (request, signal) => {
    try {
      const { valid, diagnostics } = await fetchCheck(request, signal);
      if (valid) {
        return { status: 'valid', diagnostics };
      }
      return {
        status: 'invalid',
        diagnostics: diagnostics.length > 0 ? diagnostics : [rejectedWithoutDetails],
      };
    } catch (error) {
      const isUnreachable =
        isHttpFetchError(error) &&
        (error.response === undefined || UNREACHABLE_STATUSES.has(error.response.status));
      return isUnreachable
        ? { status: 'unchecked' }
        : { status: 'failed', message: getFormattedError(error).message };
    }
  };

export const createComponentChecker = ({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}): ComponentChecker =>
  toComponentChecker((request, signal) =>
    streamsRepositoryClient.fetch('POST /internal/streams/components/_validate', {
      params: { body: request },
      signal: signal ?? null,
    })
  );
