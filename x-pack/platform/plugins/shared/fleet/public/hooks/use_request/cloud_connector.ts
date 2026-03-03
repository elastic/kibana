/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '../../../common';

import { cloudConnectorRouteService } from '../../../common/services';
import type {
  CompleteCloudConnectorSetupRequest,
  CompleteCloudConnectorSetupResponse,
} from '../../../common/types/rest_spec/cloud_connector';

import { sendRequestForRq } from './use_request';

export const sendCompleteCloudConnectorSetup = (body: CompleteCloudConnectorSetupRequest) => {
  return sendRequestForRq<CompleteCloudConnectorSetupResponse>({
    path: cloudConnectorRouteService.getCompletePath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(body),
  });
};
