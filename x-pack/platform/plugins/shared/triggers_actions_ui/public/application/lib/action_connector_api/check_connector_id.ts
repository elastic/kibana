/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { BASE_ACTION_API_PATH } from '../../constants';

export interface CheckConnectorIdResponse {
  isAvailable: boolean;
}

export async function checkConnectorIdAvailability({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<CheckConnectorIdResponse> {
  const path = `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}`;
  try {
    await http.head(path, { asResponse: true, rawResponse: true });
    return { isAvailable: false };
  } catch (error) {
    if (isHttpFetchError(error) && error.response?.status === 404) {
      return { isAvailable: true };
    }
    throw error;
  }
}
