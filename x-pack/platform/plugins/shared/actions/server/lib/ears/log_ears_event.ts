/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { EarsRequestError } from './ears_request_error';

export type EarsLogStep = 'authorize' | 'token_exchange' | 'token_refresh' | 'revoke' | 'execute';
export type EarsLogOutcome = 'success' | 'failure';

export interface EarsLogEvent {
  step: EarsLogStep;
  outcome: EarsLogOutcome;
  connectorId: string;
  provider?: string;
  profileUid?: string;
  spaceId?: string;
  state?: string;
  earsRequestId?: string;
  status?: number;
  executionId?: string;
  extra?: Record<string, string | number | boolean | undefined>;
}

/**
 * Logs one EARS auth event with a consistent set of fields. The `ears` tag is what ties these lines
 * together, since they come from different loggers (routes, auth strategy, executor).
 * Logs at `info` on success and `warn` on failure: the failure paths already log an `error` of
 * their own, so this line adds the searchable fields without doubling the errors.
 * Never pass tokens, authorization codes or PKCE verifiers.
 */
export const logEarsEvent = (logger: Logger, event: EarsLogEvent): void => {
  const { step, outcome, extra, ...fields } = event;
  const details = Object.entries({ ...fields, ...extra })
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  logger[outcome === 'success' ? 'info' : 'warn'](
    `EARS ${step} ${outcome}${details ? `: ${details}` : ''}`,
    {
      tags: ['ears', step, outcome],
    }
  );
};

/**
 * Failure fields for a log line: status and request id when EARS answered, otherwise the error
 * message as `reason` (e.g. a network error or timeout, where there is no EARS response to report).
 */
export const getEarsErrorLogFields = (
  err: unknown
): Pick<EarsLogEvent, 'earsRequestId' | 'status' | 'extra'> =>
  err instanceof EarsRequestError
    ? { earsRequestId: err.earsRequestId, status: err.status }
    : { extra: { reason: err instanceof Error ? err.message : String(err) } };
