/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { TestEndpointResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { ROUTE_VERSIONS } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useTestEndpoint = () => {
  const { services } = useKibana();

  return useMutation<TestEndpointResponse, IHttpFetchError<ResponseErrorBody>, string>({
    mutationFn: (inferenceId: string) =>
      services.http.post<TestEndpointResponse>(
        APIRoutes.TEST_INFERENCE_ENDPOINT.replace('{id}', encodeURIComponent(inferenceId)),
        { version: ROUTE_VERSIONS.v1 }
      ),
  });
};
