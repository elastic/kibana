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
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';

export interface UseFetchAnonymizationFieldsParams {
  http: HttpSetup;
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
}: UseFetchAnonymizationFieldsParams) => {
  const query = {
    page: 1,
    per_page: 100,
  };

  const cachingKeys = [
    ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
    query.page,
    query.per_page,
    ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ];

  return useQuery([cachingKeys, query], async () => {
    const res = await http.fetch<FindAnonymizationFieldsResponse>(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
      {
        method: 'GET',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        query,
        signal,
      }
    );
    return res;
  });
};
