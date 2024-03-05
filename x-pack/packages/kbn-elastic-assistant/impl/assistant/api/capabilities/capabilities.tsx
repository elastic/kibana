/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import { API_VERSIONS, GetCapabilitiesResponse } from '@kbn/elastic-assistant-common';

export interface GetCapabilitiesParams {
  http: HttpSetup;
  signal?: AbortSignal | undefined;
}

/**
 * API call for fetching assistant capabilities
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<GetCapabilitiesResponse | IHttpFetchError>}
 */
export const getCapabilities = async ({
  http,
  signal,
}: GetCapabilitiesParams): Promise<GetCapabilitiesResponse | IHttpFetchError> => {
  try {
    const path = `/internal/elastic_assistant/capabilities`;

    return await http.get<GetCapabilitiesResponse>(path, {
      signal,
      version: API_VERSIONS.internal.v1,
    });
  } catch (error) {
    return error as IHttpFetchError;
  }
};
