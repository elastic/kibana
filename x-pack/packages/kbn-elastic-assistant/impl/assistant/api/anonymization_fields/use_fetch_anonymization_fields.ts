/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@tanstack/react-query';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
} from '@kbn/elastic-assistant-common';

export interface UseFetchAnonymizationFieldsParams {
  http: HttpSetup;
  isAssistantEnabled: boolean;
  signal?: AbortSignal | undefined;
}

/**
 * API call for fetching anonymization fields for current spaceId
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {useQuery} hook for getting the status of the anonymization fields
 */
export const useFetchAnonymizationFields = ({
  http,
  signal,
  isAssistantEnabled,
}: UseFetchAnonymizationFieldsParams) => {
  const query = {
    page: 1,
    per_page: 1000, // Continue use in-memory paging till the new design will be ready
  };

  const cachingKeys = [
    ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
    query.page,
    query.per_page,
    API_VERSIONS.public.v1,
  ];

  return useQuery([cachingKeys, query], async () => {
    if (!isAssistantEnabled) {
      return { page: 0, perPage: 0, total: 0, data: [] };
    }
    const res = await http.fetch<FindAnonymizationFieldsResponse>(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
      {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query,
        signal,
      }
    );
    return res;
  });
};
