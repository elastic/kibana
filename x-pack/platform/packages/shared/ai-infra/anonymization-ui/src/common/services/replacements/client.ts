/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  DeanonymizeWithReplacementsResponse as deanonymizeWithReplacementsResponseSchema,
  GetAnonymizationReplacementsResponse as getAnonymizationReplacementsResponseSchema,
  type DeanonymizeWithReplacementsRequestBody,
  type DeanonymizeWithReplacementsResponse as DeanonymizeWithReplacementsResponseType,
  type GetAnonymizationReplacementsResponse as GetAnonymizationReplacementsResponseType,
} from '@kbn/anonymization-common';
import type { TokenToOriginalMap } from '../../types/replacements';
import { mapReplacementsApiError } from './errors';
import { ANONYMIZATION_API_VERSION, ANONYMIZATION_REPLACEMENTS_API_BASE } from './constants';

interface AnonymizationReplacementsHttpService {
  fetch: HttpSetup['fetch'];
}

export interface AnonymizationReplacementsClient {
  getReplacements: (id: string) => Promise<GetAnonymizationReplacementsResponseType>;
  deanonymizeText: (
    input: DeanonymizeWithReplacementsRequestBody
  ) => Promise<DeanonymizeWithReplacementsResponseType>;
  getTokenToOriginalMap: (id: string) => Promise<TokenToOriginalMap>;
}

const fetchWithApiErrorMapping = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    throw mapReplacementsApiError(error);
  }
};

const toReplacementsResponse = (response: unknown): GetAnonymizationReplacementsResponseType => {
  const parsed = getAnonymizationReplacementsResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('Invalid replacements response payload');
  }
  return parsed.data;
};

const toDeanonymizeResponse = (response: unknown): DeanonymizeWithReplacementsResponseType => {
  const parsed = deanonymizeWithReplacementsResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('Invalid deanonymize response payload');
  }
  return parsed.data;
};

export const createAnonymizationReplacementsClient = (
  http: AnonymizationReplacementsHttpService
): AnonymizationReplacementsClient => {
  const getReplacements = async (id: string) => {
    const response = await fetchWithApiErrorMapping(() =>
      http.fetch<GetAnonymizationReplacementsResponseType>(
        `${ANONYMIZATION_REPLACEMENTS_API_BASE}/${encodeURIComponent(id)}`,
        {
          method: 'GET',
          version: ANONYMIZATION_API_VERSION,
        }
      )
    );
    return toReplacementsResponse(response);
  };

  const deanonymizeText = async (input: DeanonymizeWithReplacementsRequestBody) => {
    const response = await fetchWithApiErrorMapping(() =>
      http.fetch<DeanonymizeWithReplacementsResponseType>(
        `${ANONYMIZATION_REPLACEMENTS_API_BASE}/_deanonymize`,
        {
          method: 'POST',
          version: ANONYMIZATION_API_VERSION,
          body: JSON.stringify(input),
        }
      )
    );
    return toDeanonymizeResponse(response);
  };

  const getTokenToOriginalMap = async (id: string): Promise<TokenToOriginalMap> => {
    const response = await getReplacements(id);
    return Object.fromEntries(
      response.replacements.map((replacement) => [replacement.anonymized, replacement.original])
    );
  };

  return {
    getReplacements,
    deanonymizeText,
    getTokenToOriginalMap,
  };
};
