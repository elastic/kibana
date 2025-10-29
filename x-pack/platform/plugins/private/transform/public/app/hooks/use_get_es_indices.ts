/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';
import type { EsIndex } from '../../../common/types/es_index';

import { useAppDependencies } from '../app_dependencies';

export const useGetEsIndices = () => {
  const { http } = useAppDependencies();

  return useQuery<EsIndex[], IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_ES_INDICES],
    ({ signal }) =>
      http.get<EsIndex[]>('/api/index_management/indices', {
        version: '1',
        signal,
      })
  );
};
