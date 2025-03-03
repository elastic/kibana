/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import type { GetTransformsResponseSchema } from '../../../server/routes/api_schemas/transforms';
import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';
import type { TransformId } from '../../../common/types/transform';

import { useAppDependencies } from '../app_dependencies';

export const useGetTransform = (transformId: TransformId, enabled?: boolean) => {
  const { http } = useAppDependencies();

  return useQuery<GetTransformsResponseSchema, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM, transformId],
    ({ signal }) =>
      http.get<GetTransformsResponseSchema>(addInternalBasePath(`transforms/${transformId}`), {
        version: '1',
        signal,
      }),
    { enabled }
  );
};
