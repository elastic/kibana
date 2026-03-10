/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { BASE_ACTION_API_PATH } from '../../constants';

interface CheckConnectorIdResponse {
  connectorIdAvailable: boolean;
}

export async function checkConnectorIdAvailability({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<CheckConnectorIdResponse> {
  return http.get<CheckConnectorIdResponse>(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}/_check_availability`
  );
}
