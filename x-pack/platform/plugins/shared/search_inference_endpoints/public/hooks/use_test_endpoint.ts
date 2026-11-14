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
import type { TestTargetVariables } from '../utils/test_target';
import { useKibana } from './use_kibana';

const getPath = (variables: TestTargetVariables) => {
  if ('featureId' in variables) {
    return APIRoutes.TEST_FEATURE.replace('{featureId}', encodeURIComponent(variables.featureId));
  }
  if ('connectorId' in variables) {
    return APIRoutes.TEST_CONNECTOR.replace(
      '{connectorId}',
      encodeURIComponent(variables.connectorId)
    );
  }
  return APIRoutes.TEST_INFERENCE_ENDPOINT.replace(
    '{id}',
    encodeURIComponent(variables.inferenceId)
  );
};

type TestEndpointVariables = TestTargetVariables & {
  message: string;
  documents?: string[];
  checkToolCalling?: boolean;
};

export const useTestEndpoint = () => {
  const { services } = useKibana();

  return useMutation<
    TestEndpointResponse,
    IHttpFetchError<ResponseErrorBody>,
    TestEndpointVariables
  >({
    mutationFn: (variables: TestEndpointVariables) => {
      const path = getPath(variables);

      return services.http.post<TestEndpointResponse>(path, {
        body: JSON.stringify({
          message: variables.message,
          documents: variables.documents,
          checkToolCalling: variables.checkToolCalling,
        }),
        version: ROUTE_VERSIONS.v1,
      });
    },
  });
};
