/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  COMMON_HEADERS,
  KBN_ARCHIVES,
  SO_MANAGEMENT_WRITE_ROLE,
  SO_TAGGING_WRITE_ROLE,
} from '../fixtures';

apiTest.describe('Saved Objects Tagging - bulk delete tags', { tag: tags.stateful.classic }, () => {
  let privilegedCookieHeader: Record<string, string>;
  let soTaggingWriteCookieHeader: Record<string, string>;
  let soManagementWriteCookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    privilegedCookieHeader = (await samlAuth.asInteractiveUser('editor')).cookieHeader;
    soTaggingWriteCookieHeader = (await samlAuth.asInteractiveUser(SO_TAGGING_WRITE_ROLE))
      .cookieHeader;
    soManagementWriteCookieHeader = (await samlAuth.asInteractiveUser(SO_MANAGEMENT_WRITE_ROLE))
      .cookieHeader;
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.importExport.load(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest('bulk deletes tags for privileged user', async ({ apiClient }) => {
    const response = await apiClient.post('internal/saved_objects_tagging/tags/_bulk_delete', {
      headers: { ...COMMON_HEADERS, ...privilegedCookieHeader },
      body: { ids: ['default-space-tag-1', 'default-space-tag-2'] },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({});
  });

  apiTest(
    'bulk deletes tags for user with only SO tagging write access (minimal privilege)',
    async ({ apiClient }) => {
      const response = await apiClient.post('internal/saved_objects_tagging/tags/_bulk_delete', {
        headers: { ...COMMON_HEADERS, ...soTaggingWriteCookieHeader },
        body: { ids: ['default-space-tag-1', 'default-space-tag-2'] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({});
    }
  );

  apiTest('bulk deletes tags for user with SO management write access', async ({ apiClient }) => {
    const response = await apiClient.post('internal/saved_objects_tagging/tags/_bulk_delete', {
      headers: { ...COMMON_HEADERS, ...soManagementWriteCookieHeader },
      body: { ids: ['default-space-tag-1', 'default-space-tag-2'] },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({});
  });

  apiTest('returns 403 for viewer user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const response = await apiClient.post('internal/saved_objects_tagging/tags/_bulk_delete', {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: { ids: ['default-space-tag-1', 'default-space-tag-2'] },
    });
    expect(response).toHaveStatusCode(403);
    expect(response.body).toStrictEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unable to delete tag',
    });
  });
});
