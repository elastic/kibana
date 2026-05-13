/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { useQuery } from '@kbn/react-query';

import type {
  GetOtelCollectorsRequestSchema,
  GetOtelCollectorsResponseSchema,
} from '../../../common/types/rest_spec/otel_collector';
import { API_VERSIONS } from '../../../common/constants';
import { otelCollectorRouteService } from '../../services';

import { sendRequestForRq } from './use_request';

type GetOtelCollectorsQuery = TypeOf<typeof GetOtelCollectorsRequestSchema.query>;
type GetOtelCollectorsResponse = TypeOf<typeof GetOtelCollectorsResponseSchema>;

export const sendGetOtelCollectors = (query: GetOtelCollectorsQuery) =>
  sendRequestForRq<GetOtelCollectorsResponse>({
    method: 'get',
    path: otelCollectorRouteService.getListPath(),
    version: API_VERSIONS.public.v1,
    query,
  });

export const useGetOtelCollectorsQuery = (
  query: GetOtelCollectorsQuery,
  options: { enabled?: boolean; refetchInterval?: number | false } = {}
) =>
  useQuery(['otel-collectors', query], () => sendGetOtelCollectors(query), {
    enabled: options.enabled,
    refetchInterval: options.refetchInterval,
    keepPreviousData: true,
  });
