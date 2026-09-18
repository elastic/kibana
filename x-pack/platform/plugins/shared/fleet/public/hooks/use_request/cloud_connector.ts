/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudConnectorIacState } from '../../../common/types/models/cloud_connector';
import type { UpdateCloudConnectorResponse } from '../../../common/types/rest_spec/cloud_connector';
import { API_VERSIONS, CLOUD_CONNECTOR_API_ROUTES } from '../../../common/constants';

import { sendRequest } from './use_request';

export function sendUpdateCloudConnector(cloudConnectorId: string, iac: CloudConnectorIacState) {
  return sendRequest<UpdateCloudConnectorResponse>({
    method: 'put',
    path: CLOUD_CONNECTOR_API_ROUTES.UPDATE_PATTERN.replace('{cloudConnectorId}', cloudConnectorId),
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(iac),
  });
}
