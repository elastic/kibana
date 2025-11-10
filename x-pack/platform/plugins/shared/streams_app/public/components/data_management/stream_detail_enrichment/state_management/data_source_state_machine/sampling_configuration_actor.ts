/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ErrorActorEvent } from 'xstate5';
import { fromPromise } from 'xstate5';
import type { errors as esErrors } from '@elastic/elasticsearch';
import { getFormattedError } from '../../../../../util/errors';
import type { DataSourceMachineDeps } from './types';

export interface SamplingConfigInput {
  condition?: string;
}

/**
 * Creates an actor that configures sampling by calling the backend API
 * This ensures the OTel collector will start sampling documents based on the configuration
 */
export function createSamplingConfigActor({
  streamsRepositoryClient,
}: Pick<DataSourceMachineDeps, 'streamsRepositoryClient'>) {
  return fromPromise<void, SamplingConfigInput>(async ({ input, signal }) => {
    await streamsRepositoryClient.fetch('PUT /internal/streams/sampling/configure', {
      signal,
      params: {
        body: {
          condition: input.condition,
        },
      },
    });
  });
}

/**
 * Creates an actor that disables sampling by calling the backend API
 * This is called during cleanup when navigating away
 */
export function createSamplingDisableActor({
  streamsRepositoryClient,
}: Pick<DataSourceMachineDeps, 'streamsRepositoryClient'>) {
  return fromPromise<void, void>(async ({ signal }) => {
    await streamsRepositoryClient.fetch('DELETE /internal/streams/sampling/configure', {
      signal,
      params: {},
    });
  });
}

/**
 * Creates a notifier for sampling configuration failures
 */
export function createSamplingConfigFailureNotifier({
  toasts,
}: Pick<DataSourceMachineDeps, 'toasts'>) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    const formattedError = getFormattedError(event.error);
    toasts.addError(formattedError, {
      title: i18n.translate('xpack.streams.enrichment.sampling.configError', {
        defaultMessage: 'Failed to configure sampling',
      }),
      toastMessage: formattedError.message,
    });
  };
}
