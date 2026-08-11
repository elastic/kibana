/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  AnonymizationProfile,
  CreateAnonymizationProfileRequest,
  FindAnonymizationProfilesResponse,
  DeleteAnonymizationProfileResponse,
} from '@kbn/anonymization-common';
import {
  toCreateProfilePayload,
  toFindProfilesQuery,
  toProfile,
  toProfilesListResult,
  toUpdateProfilePayload,
} from './adapters';
import { ANONYMIZATION_API_VERSION, ANONYMIZATION_PROFILES_API_BASE } from './constants';
import { mapProfilesApiError } from './errors';
import type { ProfilesListQuery, UpdateProfileInput } from '../../types/profiles';

export interface AnonymizationProfilesClient {
  findProfiles: (query: ProfilesListQuery) => Promise<FindAnonymizationProfilesResponse>;
  getProfile: (id: string) => Promise<ReturnType<typeof toProfile>>;
  createProfile: (
    input: CreateAnonymizationProfileRequest
  ) => Promise<ReturnType<typeof toProfile>>;
  updateProfile: (input: UpdateProfileInput) => Promise<ReturnType<typeof toProfile>>;
  deleteProfile: (id: string) => Promise<DeleteAnonymizationProfileResponse>;
}

interface AnonymizationProfilesHttpService {
  fetch: HttpSetup['fetch'];
}

const fetchWithApiErrorMapping = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    throw mapProfilesApiError(error);
  }
};

export const createAnonymizationProfilesClient = (
  http: AnonymizationProfilesHttpService
): AnonymizationProfilesClient => ({
  async findProfiles(query) {
    const response = await fetchWithApiErrorMapping(() =>
      http.fetch<FindAnonymizationProfilesResponse>(`${ANONYMIZATION_PROFILES_API_BASE}/_find`, {
        method: 'GET',
        version: ANONYMIZATION_API_VERSION,
        query: toFindProfilesQuery(query),
      })
    );

    return toProfilesListResult(response);
  },

  async getProfile(id) {
    const response = await fetchWithApiErrorMapping(() =>
      http.fetch<AnonymizationProfile>(`${ANONYMIZATION_PROFILES_API_BASE}/${id}`, {
        method: 'GET',
        version: ANONYMIZATION_API_VERSION,
      })
    );

    return toProfile(response);
  },

  async createProfile(input) {
    const response = await fetchWithApiErrorMapping(() =>
      http.fetch<AnonymizationProfile>(ANONYMIZATION_PROFILES_API_BASE, {
        method: 'POST',
        version: ANONYMIZATION_API_VERSION,
        body: JSON.stringify(toCreateProfilePayload(input)),
      })
    );

    return toProfile(response);
  },

  async updateProfile(input) {
    const response = await fetchWithApiErrorMapping(() =>
      http.fetch<AnonymizationProfile>(`${ANONYMIZATION_PROFILES_API_BASE}/${input.id}`, {
        method: 'PUT',
        version: ANONYMIZATION_API_VERSION,
        body: JSON.stringify(toUpdateProfilePayload(input)),
      })
    );

    return toProfile(response);
  },

  async deleteProfile(id) {
    return fetchWithApiErrorMapping(() =>
      http.fetch<DeleteAnonymizationProfileResponse>(`${ANONYMIZATION_PROFILES_API_BASE}/${id}`, {
        method: 'DELETE',
        version: ANONYMIZATION_API_VERSION,
      })
    );
  },
});
