/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import type { GetTransformsStatsResponseSchema } from '../../../server/routes/api_schemas/transforms_stats';
import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';
import type { TransformId } from '../../../common/types/transform';

import { useAppDependencies } from '../app_dependencies';

export const useGetTransformStats = (
  transformId: TransformId,
  basic = false,
  enabled?: boolean,
  refetchInterval?: number | false
) => {
  const { http } = useAppDependencies();

  return useQuery<GetTransformsStatsResponseSchema, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM_STATS, transformId],
    ({ signal }) =>
      http.get<GetTransformsStatsResponseSchema>(
        addInternalBasePath(`transforms/${transformId}/_stats`),
        {
          query: { basic },
          version: '1',
          signal,
        }
      ),
    { enabled, refetchInterval }
  );
};

export const useGetTransformsStats = ({
  basic = false,
  enabled,
  refetchInterval,
}: {
  basic?: boolean;
  enabled?: boolean;
  refetchInterval?: number | false;
}) => {
  const { http } = useAppDependencies();

  return useQuery<GetTransformsStatsResponseSchema, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORMS_STATS],
    ({ signal }) =>
      http.get<GetTransformsStatsResponseSchema>(addInternalBasePath(`transforms/_stats`), {
        query: { basic },
        version: '1',
        asSystemRequest: true,
        signal,
      }),
    { enabled, refetchInterval }
  );
};
