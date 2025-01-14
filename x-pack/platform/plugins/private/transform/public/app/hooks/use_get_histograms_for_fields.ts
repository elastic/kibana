/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '@kbn/ml-agg-utils';
import type { SavedSearchQuery } from '@kbn/ml-query-utils';

import type {
  FieldHistogramsRequestSchema,
  FieldHistogramsResponseSchema,
} from '../../../server/routes/api_schemas/field_histograms';
import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}

export const useGetHistogramsForFields = (
  dataViewTitle: string,
  fields: FieldHistogramRequestConfig[],
  query: string | SavedSearchQuery,
  runtimeMappings?: FieldHistogramsRequestSchema['runtimeMappings'],
  enabled?: boolean,
  samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE
) => {
  const { http } = useAppDependencies();

  return useQuery<FieldHistogramsResponseSchema, IHttpFetchError>(
    [
      TRANSFORM_REACT_QUERY_KEYS.GET_HISTOGRAMS_FOR_FIELDS,
      {
        dataViewTitle,
        fields,
        query,
        runtimeMappings,
        samplerShardSize,
      },
    ],
    ({ signal }) =>
      http.post<FieldHistogramsResponseSchema>(
        addInternalBasePath(`field_histograms/${dataViewTitle}`),
        {
          body: JSON.stringify({
            query,
            fields,
            samplerShardSize,
            ...(runtimeMappings !== undefined ? { runtimeMappings } : {}),
          }),
          version: '1',
          signal,
        }
      ),
    { enabled }
  );
};
