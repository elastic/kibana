/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type {
  CreateConnectorTypeRequest,
  CreateConnectorTypeResponse,
} from '@kbn/actions-plugin/common';
import { BASE_ACTION_API_PATH } from '../../constants';

export async function createConnectorType({
  http,
  connectorType,
}: {
  http: HttpSetup;
  connectorType: CreateConnectorTypeRequest;
}): Promise<CreateConnectorTypeResponse> {
  return http.post<CreateConnectorTypeResponse>(`${BASE_ACTION_API_PATH}/connector_types`, {
    body: JSON.stringify(connectorType),
  });
}
