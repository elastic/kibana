/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DASHBOARD_WRITE_ROLE, SO_TAGGING_READ_ROLE } from '../fixtures';

apiTest.describe(
  'Saved Objects Tagging - get assignable types',
  { tag: tags.stateful.classic },
  () => {
    let privilegedCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      privilegedCookieHeader = (await samlAuth.asInteractiveUser('editor')).cookieHeader;
    });

    apiTest(
      'returns dashboard and visualization types for privileged user',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          'internal/saved_objects_tagging/assignments/_assignable_types',
          { headers: { ...COMMON_HEADERS, ...privilegedCookieHeader } }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.types).toContain('dashboard');
        expect(response.body.types).toContain('visualization');
      }
    );

    apiTest(
      'returns only dashboard type for dashboard write user',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(DASHBOARD_WRITE_ROLE);
        const response = await apiClient.get(
          'internal/saved_objects_tagging/assignments/_assignable_types',
          { headers: { ...COMMON_HEADERS, ...cookieHeader } }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.types).toStrictEqual(['dashboard']);
      }
    );

    apiTest(
      'returns empty list for user with base read access',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const response = await apiClient.get(
          'internal/saved_objects_tagging/assignments/_assignable_types',
          { headers: { ...COMMON_HEADERS, ...cookieHeader } }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.types).toStrictEqual([]);
      }
    );

    apiTest(
      'returns empty list because SO tagging read access does not grant write access to any object type',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(SO_TAGGING_READ_ROLE);
        const response = await apiClient.get(
          'internal/saved_objects_tagging/assignments/_assignable_types',
          { headers: { ...COMMON_HEADERS, ...cookieHeader } }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.types).toStrictEqual([]);
      }
    );
  }
);
