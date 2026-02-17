/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { MappingPropertyBase } from '@elastic/elasticsearch/lib/api/types';
import { useQuery } from '@kbn/react-query';

const KNOWLEDGE_BASE_MAPPINGS_QUERY_KEY = ['elastic-assistant', 'knowledge-base-mappings'];

export interface Mappings {
  mappings: {
    properties: MappingPropertyBase['properties'];
  };
}

export interface UseIndexMappingParams {
  http: HttpSetup;
  indexName: string;
  toasts?: IToasts;
}

/**
 * Hook for getting index mappings
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} [options.http] - HttpSetup
 * @param {String} [options.indexName] - String
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useQuery} hook for getting mappings for a given index
 */
export const useIndexMappings = ({
  indexName,
  http,
  toasts,
}: UseIndexMappingParams): UseQueryResult<Mappings, IHttpFetchError> => {
  return useQuery(
    [KNOWLEDGE_BASE_MAPPINGS_QUERY_KEY, indexName],
    async ({ signal }) => {
      return http.fetch<Mappings>(
        `/api/index_management/mapping/${encodeURIComponent(indexName)}`,
        { signal }
      );
    },
    {
      enabled: !!indexName,
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.elasticAssistant.knowledgeBase.mappingsError', {
                defaultMessage: 'Error fetching Knowledge Base mappings',
              }),
            }
          );
        }
      },
    }
  );
};
