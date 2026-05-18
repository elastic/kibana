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
  KBN_ARCHIVES,
  SO_MANAGEMENT_WRITE_ROLE,
  SO_TAGGING_WRITE_ROLE,
} from '../fixtures';

apiTest.describe('Saved Objects Tagging - update tag', { tag: tags.stateful.classic }, () => {
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

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.importExport.load(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest('updates a tag for user with SO tagging write access', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects_tagging/tags/default-space-tag-1', {
      headers: { ...COMMON_HEADERS, ...privilegedUserCredentials.apiKeyHeader },
      body: { name: 'Updated title', description: 'I just updated that', color: '#009000' },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      tag: {
        id: 'default-space-tag-1',
        name: 'Updated title',
        description: 'I just updated that',
        color: '#009000',
        managed: false,
      },
    });
  });

  apiTest(
    'updates a tag for user with only SO tagging write access (minimal privilege)',
    async ({ apiClient }) => {
      const response = await apiClient.post('api/saved_objects_tagging/tags/default-space-tag-1', {
        headers: { ...COMMON_HEADERS, ...soTaggingWriteCredentials.apiKeyHeader },
        body: { name: 'Updated via SO tagging write', description: 'Updated', color: '#009000' },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.tag).toMatchObject({
        id: 'default-space-tag-1',
        name: 'Updated via SO tagging write',
        managed: false,
      });
    }
  );

  apiTest('updates a tag for user with SO management write access', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects_tagging/tags/default-space-tag-1', {
      headers: { ...COMMON_HEADERS, ...soManagementWriteCredentials.apiKeyHeader },
      body: { name: 'Updated via SO management', description: 'Updated', color: '#009000' },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      tag: {
        id: 'default-space-tag-1',
        name: 'Updated via SO management',
        description: 'Updated',
        color: '#009000',
        managed: false,
      },
    });
  });

  apiTest('returns 403 for user with SO tagging read-only access', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects_tagging/tags/default-space-tag-1', {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      body: { name: 'Updated title', description: 'I just updated that', color: '#009000' },
    });
    expect(response).toHaveStatusCode(403);
    expect(response.body).toStrictEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unable to update tag',
    });
  });
});
