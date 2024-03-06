/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { PostDataset } from '@kbn/elastic-assistant-common/impl/schemas';
import { postDatasets } from './datasets';

const PERFORM_DATASETS_MUTATION_KEY = ['elastic-assistant', 'post-dataset'];

export interface UseAddToDatasetParams {
  http: HttpSetup;
  toasts?: IToasts;
}

export interface AddToDatasetParams {
  datasetId: string;
  dataset: PostDataset;
}

/**
 * Hook for performing model evaluations
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useMutation} mutation hook for setting up the Knowledge Base
 */
export const useAddToDataset = ({ http, toasts }: UseAddToDatasetParams) => {
  return useMutation(
    PERFORM_DATASETS_MUTATION_KEY,
    (datasetParams: AddToDatasetParams) => {
      // Optional params workaround: see: https://github.com/TanStack/query/issues/1077#issuecomment-1431247266
      return postDatasets({ http, datasetParams });
    },
    {
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.elasticAssistant.datasets.postDatasetsError', {
                defaultMessage: 'Error posting datasets...',
              }),
            }
          );
        }
      },
    }
  );
};
