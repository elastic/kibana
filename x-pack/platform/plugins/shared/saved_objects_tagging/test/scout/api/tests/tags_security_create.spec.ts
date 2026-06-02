/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  COMMON_HEADERS,
  SO_MANAGEMENT_WRITE_ROLE,
  SO_TAGGING_WRITE_ROLE,
} from '../fixtures';

apiTest.describe('Saved Objects Tagging - create tag', { tag: tags.stateful.classic }, () => {
  let privilegedUserCredentials: RoleApiCredentials;
  let soTaggingWriteCredentials: RoleApiCredentials;
  let soManagementWriteCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    privilegedUserCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    soTaggingWriteCredentials = await requestAuth.getApiKeyForCustomRole(SO_TAGGING_WRITE_ROLE);
    soManagementWriteCredentials = await requestAuth.getApiKeyForCustomRole(
      SO_MANAGEMENT_WRITE_ROLE
    );
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest('creates a tag for user with SO tagging write access', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects_tagging/tags/create', {
      headers: { ...COMMON_HEADERS, ...privilegedUserCredentials.apiKeyHeader },
      body: { name: 'My new tag', description: 'I just created that', color: '#009000' },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.tag).toMatchObject({
      name: 'My new tag',
      description: 'I just created that',
      color: '#009000',
      managed: false,
    });

    await apiClient.delete(`api/saved_objects_tagging/tags/${response.body.tag.id}`, {
      headers: { ...COMMON_HEADERS, ...privilegedUserCredentials.apiKeyHeader },
    });
  });

  apiTest(
    'creates a tag for user with only SO tagging write access (minimal privilege)',
    async ({ apiClient }) => {
      const response = await apiClient.post('api/saved_objects_tagging/tags/create', {
        headers: { ...COMMON_HEADERS, ...soTaggingWriteCredentials.apiKeyHeader },
        body: {
          name: 'My tagging-write tag',
          description: 'Created via SO tagging write',
          color: '#009000',
        },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.tag).toMatchObject({ name: 'My tagging-write tag', managed: false });

      await apiClient.delete(`api/saved_objects_tagging/tags/${response.body.tag.id}`, {
        headers: { ...COMMON_HEADERS, ...soTaggingWriteCredentials.apiKeyHeader },
      });
    }
  );

  apiTest('creates a tag for user with SO management write access', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects_tagging/tags/create', {
      headers: { ...COMMON_HEADERS, ...soManagementWriteCredentials.apiKeyHeader },
      body: {
        name: 'My SO management tag',
        description: 'Created via SO management',
        color: '#009000',
      },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.tag).toMatchObject({
      name: 'My SO management tag',
      managed: false,
    });

    await apiClient.delete(`api/saved_objects_tagging/tags/${response.body.tag.id}`, {
      headers: { ...COMMON_HEADERS, ...soManagementWriteCredentials.apiKeyHeader },
    });
  });

  apiTest('returns 403 for user with SO tagging read-only access', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects_tagging/tags/create', {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      body: { name: 'My new tag', description: 'I just created that', color: '#009000' },
    });
    expect(response).toHaveStatusCode(403);
    expect(response.body).toStrictEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unable to create tag',
    });
  });
});
