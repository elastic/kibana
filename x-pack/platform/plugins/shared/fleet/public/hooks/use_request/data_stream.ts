/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { dataStreamRouteService } from '../../services';
import type { GetDataStreamsResponse } from '../../types';
import type { DeprecatedILMPolicyCheckResponse } from '../../../common/types';
import { API_VERSIONS } from '../../../common/constants';

import type { RequestError } from './use_request';
import { useRequest, sendRequest, sendRequestForRq } from './use_request';

export const useGetDataStreams = () => {
  return useRequest<GetDataStreamsResponse>({
    path: dataStreamRouteService.getListPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendGetDataStreams = async () => {
  const res = await sendRequest<GetDataStreamsResponse>({
    path: dataStreamRouteService.getListPath(),
    method: 'get',
  });

  if (res.error) {
    throw res.error;
  }

  return res.data;
};

export const useGetDeprecatedILMCheckQuery = () => {
  return useQuery<DeprecatedILMPolicyCheckResponse, RequestError>(['deprecated-ilm-check'], () =>
    sendRequestForRq<DeprecatedILMPolicyCheckResponse>({
      path: dataStreamRouteService.getDeprecatedILMCheckPath(),
      method: 'get',
      version: API_VERSIONS.internal.v1,
    })
  );
};
