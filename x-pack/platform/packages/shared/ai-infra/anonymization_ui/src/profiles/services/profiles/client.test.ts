/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnonymizationProfilesClient } from './client';
import { ANONYMIZATION_API_VERSION, ANONYMIZATION_PROFILES_API_BASE } from '../../constants';
import { TARGET_TYPE_DATA_VIEW } from '../../../target_types';

describe('createAnonymizationProfilesClient', () => {
  const profileResponse = {
    id: 'profile-1',
    name: 'Logs profile',
    targetType: TARGET_TYPE_DATA_VIEW,
    targetId: 'logs-*',
    rules: {
      fieldRules: [{ field: 'message', allowed: false, anonymized: true, entityClass: 'message' }],
      regexRules: [
        {
          id: 'regex-rule',
          type: 'regex' as const,
          entityClass: 'email',
          pattern: '[a-z]+@[a-z]+',
          enabled: true,
        },
      ],
      nerRules: [
        {
          id: 'ner-rule',
          type: 'ner' as const,
          modelId: 'model-1',
          allowedEntityClasses: ['organization'],
          enabled: true,
        },
      ],
    },
    saltId: 'salt-default',
    namespace: 'default',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'elastic',
    updatedBy: 'elastic',
  };

  it('serializes find query params and maps the response', async () => {
    const fetch = jest.fn().mockResolvedValue({
      page: 1,
      perPage: 20,
      total: 1,
      data: [profileResponse],
    });

    const client = createAnonymizationProfilesClient({ fetch });
    const result = await client.findProfiles({
      filter: 'logs',
      targetType: TARGET_TYPE_DATA_VIEW,
      targetId: 'logs-*',
      sortField: 'updatedAt',
      sortOrder: 'asc',
      page: 2,
      perPage: 50,
    });

    expect(fetch).toHaveBeenCalledWith(`${ANONYMIZATION_PROFILES_API_BASE}/_find`, {
      method: 'GET',
      version: ANONYMIZATION_API_VERSION,
      query: {
        filter: 'logs',
        target_type: TARGET_TYPE_DATA_VIEW,
        target_id: 'logs-*',
        sort_field: 'updated_at',
        sort_order: 'asc',
        page: 2,
        per_page: 50,
      },
    });
    expect(result.data[0].targetType).toBe(TARGET_TYPE_DATA_VIEW);
    expect(result.data[0].targetId).toBe('logs-*');
  });

  it('fetches and maps a profile by id', async () => {
    const fetch = jest.fn().mockResolvedValue(profileResponse);
    const client = createAnonymizationProfilesClient({ fetch });

    const result = await client.getProfile('profile-1');

    expect(fetch).toHaveBeenCalledWith(`${ANONYMIZATION_PROFILES_API_BASE}/profile-1`, {
      method: 'GET',
      version: ANONYMIZATION_API_VERSION,
    });
    expect(result.id).toBe('profile-1');
    expect(result.rules.regexRules?.[0].type).toBe('regex');
  });

  it('serializes create payload and maps created profile', async () => {
    const fetch = jest.fn().mockResolvedValue(profileResponse);
    const client = createAnonymizationProfilesClient({ fetch });

    const result = await client.createProfile({
      name: 'Logs profile',
      description: 'Rules for logs',
      targetType: TARGET_TYPE_DATA_VIEW,
      targetId: 'logs-*',
      rules: {
        fieldRules: [
          { field: 'message', allowed: false, anonymized: true, entityClass: 'message' },
        ],
        regexRules: [
          {
            id: 'regex-rule',
            type: 'regex',
            entityClass: 'email',
            pattern: '[a-z]+@[a-z]+',
            enabled: true,
          },
        ],
        nerRules: [
          {
            id: 'ner-rule',
            type: 'ner',
            modelId: 'model-1',
            allowedEntityClasses: ['organization'],
            enabled: true,
          },
        ],
      },
    });

    expect(fetch).toHaveBeenCalledWith(ANONYMIZATION_PROFILES_API_BASE, {
      method: 'POST',
      version: ANONYMIZATION_API_VERSION,
      body: JSON.stringify({
        name: 'Logs profile',
        description: 'Rules for logs',
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: 'logs-*',
        rules: {
          fieldRules: [
            { field: 'message', allowed: false, anonymized: true, entityClass: 'message' },
          ],
          regexRules: [
            {
              id: 'regex-rule',
              type: 'regex',
              entityClass: 'email',
              pattern: '[a-z]+@[a-z]+',
              enabled: true,
            },
          ],
          nerRules: [
            {
              id: 'ner-rule',
              type: 'ner',
              modelId: 'model-1',
              allowedEntityClasses: ['organization'],
              enabled: true,
            },
          ],
        },
      }),
    });
    expect(result.id).toBe('profile-1');
  });

  it('serializes update payload and maps updated profile', async () => {
    const fetch = jest.fn().mockResolvedValue(profileResponse);
    const client = createAnonymizationProfilesClient({ fetch });

    const result = await client.updateProfile({
      id: 'profile-1',
      name: 'Updated profile',
      description: 'Updated description',
      rules: {
        fieldRules: [
          { field: 'message', allowed: true, anonymized: false, entityClass: 'message' },
        ],
        regexRules: [
          {
            id: 'regex-rule',
            type: 'regex',
            entityClass: 'email',
            pattern: '[a-z]+@[a-z]+',
            enabled: true,
          },
        ],
        nerRules: [
          {
            id: 'ner-rule',
            type: 'ner',
            modelId: 'model-1',
            allowedEntityClasses: ['organization'],
            enabled: false,
          },
        ],
      },
    });

    expect(fetch).toHaveBeenCalledWith(`${ANONYMIZATION_PROFILES_API_BASE}/profile-1`, {
      method: 'PUT',
      version: ANONYMIZATION_API_VERSION,
      body: JSON.stringify({
        name: 'Updated profile',
        description: 'Updated description',
        rules: {
          fieldRules: [
            { field: 'message', allowed: true, anonymized: false, entityClass: 'message' },
          ],
          regexRules: [
            {
              id: 'regex-rule',
              type: 'regex',
              entityClass: 'email',
              pattern: '[a-z]+@[a-z]+',
              enabled: true,
            },
          ],
          nerRules: [
            {
              id: 'ner-rule',
              type: 'ner',
              modelId: 'model-1',
              allowedEntityClasses: ['organization'],
              enabled: false,
            },
          ],
        },
      }),
    });
    expect(result.id).toBe('profile-1');
  });

  it('deletes a profile', async () => {
    const fetch = jest.fn().mockResolvedValue({ acknowledged: true });
    const client = createAnonymizationProfilesClient({ fetch });

    const result = await client.deleteProfile('profile-1');

    expect(fetch).toHaveBeenCalledWith(`${ANONYMIZATION_PROFILES_API_BASE}/profile-1`, {
      method: 'DELETE',
      version: ANONYMIZATION_API_VERSION,
    });
    expect(result).toEqual({ acknowledged: true });
  });

  it('maps transport errors to ProfilesApiError', async () => {
    const fetch = jest.fn().mockRejectedValue({
      statusCode: 409,
      body: { message: 'duplicate target' },
    });
    const client = createAnonymizationProfilesClient({ fetch });

    await expect(client.getProfile('duplicate')).rejects.toMatchObject({
      kind: 'conflict',
      statusCode: 409,
      message: 'duplicate target',
    });
  });

  it.each([
    [{ statusCode: 403 }, 'forbidden'],
    [{ statusCode: 401 }, 'unauthorized'],
    [{ statusCode: 404 }, 'not_found'],
    [{ statusCode: 0 }, 'network'],
    [{ statusCode: 500 }, 'unknown'],
    [{}, 'network'],
  ] as const)('maps %o errors to %s', async (error, expectedKind) => {
    const fetch = jest.fn().mockRejectedValue(error);
    const client = createAnonymizationProfilesClient({ fetch });

    await expect(client.deleteProfile('profile-1')).rejects.toMatchObject({
      kind: expectedKind,
    });
  });

  it('preserves non-http errors from response transformation', async () => {
    const fetch = jest.fn().mockResolvedValue({
      page: 1,
      total: 1,
      data: [],
    });
    const client = createAnonymizationProfilesClient({ fetch });

    await expect(client.findProfiles({})).rejects.toThrow('Invalid profiles list response payload');
  });

  it('preserves non-http errors from profile transformation', async () => {
    const fetch = jest.fn().mockResolvedValue({
      ...profileResponse,
      rules: {},
    });
    const client = createAnonymizationProfilesClient({ fetch });

    await expect(client.getProfile('profile-1')).rejects.toThrow(
      'Invalid anonymization profile response payload'
    );
  });
});
