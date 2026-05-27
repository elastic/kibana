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
  DASHBOARD_WRITE_ROLE,
  VISUALIZE_WRITE_ROLE,
} from '../fixtures';

apiTest.describe(
  'Saved Objects Tagging - update tag assignments',
  { tag: tags.stateful.classic },
  () => {
    let privilegedUserCredentials: RoleApiCredentials;
    let soManagementWriteCredentials: RoleApiCredentials;
    let viewerCredentials: RoleApiCredentials;
    let dashboardWriteCredentials: RoleApiCredentials;
    let visualizeWriteCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      privilegedUserCredentials = await requestAuth.getApiKeyForPrivilegedUser();
      soManagementWriteCredentials = await requestAuth.getApiKeyForCustomRole(
        SO_MANAGEMENT_WRITE_ROLE
      );
      viewerCredentials = await requestAuth.getApiKeyForViewer();
      dashboardWriteCredentials = await requestAuth.getApiKeyForCustomRole(DASHBOARD_WRITE_ROLE);
      visualizeWriteCredentials = await requestAuth.getApiKeyForCustomRole(VISUALIZE_WRITE_ROLE);
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.importExport.load(KBN_ARCHIVES.BULK_ASSIGN);
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.BULK_ASSIGN);
    });

    apiTest('allows privileged user to assign to any object type', async ({ apiClient }) => {
      const response = await apiClient.post(
        'api/saved_objects_tagging/assignments/update_by_tags',
        {
          headers: { ...COMMON_HEADERS, ...privilegedUserCredentials.apiKeyHeader },
          body: {
            tags: ['tag-1', 'tag-2'],
            assign: [
              { type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' },
              { type: 'visualization', id: 'ref-to-tag-1' },
            ],
            unassign: [],
          },
        }
      );
      expect(response).toHaveStatusCode(200);
    });

    apiTest(
      'allows SO management write user to assign to any object type',
      async ({ apiClient }) => {
        const dashboardResponse = await apiClient.post(
          'api/saved_objects_tagging/assignments/update_by_tags',
          {
            headers: { ...COMMON_HEADERS, ...soManagementWriteCredentials.apiKeyHeader },
            body: {
              tags: ['tag-1', 'tag-2'],
              assign: [
                { type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' },
                { type: 'visualization', id: 'ref-to-tag-1' },
              ],
              unassign: [],
            },
          }
        );
        expect(dashboardResponse).toHaveStatusCode(200);
      }
    );

    apiTest(
      'allows dashboard write user to assign to dashboard but returns 403 for visualization',
      async ({ apiClient }) => {
        const dashboardResponse = await apiClient.post(
          'api/saved_objects_tagging/assignments/update_by_tags',
          {
            headers: { ...COMMON_HEADERS, ...dashboardWriteCredentials.apiKeyHeader },
            body: {
              tags: ['tag-1', 'tag-2'],
              assign: [{ type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' }],
              unassign: [],
            },
          }
        );
        expect(dashboardResponse).toHaveStatusCode(200);

        const visualizationResponse = await apiClient.post(
          'api/saved_objects_tagging/assignments/update_by_tags',
          {
            headers: { ...COMMON_HEADERS, ...dashboardWriteCredentials.apiKeyHeader },
            body: {
              tags: ['tag-1', 'tag-2'],
              assign: [{ type: 'visualization', id: 'ref-to-tag-1' }],
              unassign: [],
            },
          }
        );
        expect(visualizationResponse).toHaveStatusCode(403);
        expect(visualizationResponse.body).toStrictEqual({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Forbidden type [visualization]',
        });
      }
    );

    apiTest(
      'allows visualize write user to assign to visualization but returns 403 for dashboard',
      async ({ apiClient }) => {
        const visualizationResponse = await apiClient.post(
          'api/saved_objects_tagging/assignments/update_by_tags',
          {
            headers: { ...COMMON_HEADERS, ...visualizeWriteCredentials.apiKeyHeader },
            body: {
              tags: ['tag-1', 'tag-2'],
              assign: [{ type: 'visualization', id: 'ref-to-tag-1' }],
              unassign: [],
            },
          }
        );
        expect(visualizationResponse).toHaveStatusCode(200);

        const dashboardResponse = await apiClient.post(
          'api/saved_objects_tagging/assignments/update_by_tags',
          {
            headers: { ...COMMON_HEADERS, ...visualizeWriteCredentials.apiKeyHeader },
            body: {
              tags: ['tag-1', 'tag-2'],
              assign: [{ type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' }],
              unassign: [],
            },
          }
        );
        expect(dashboardResponse).toHaveStatusCode(403);
        expect(dashboardResponse.body).toStrictEqual({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Forbidden type [dashboard]',
        });
      }
    );

    apiTest('returns 403 for user with SO tagging read-only access', async ({ apiClient }) => {
      const response = await apiClient.post(
        'api/saved_objects_tagging/assignments/update_by_tags',
        {
          headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
          body: {
            tags: ['tag-1', 'tag-2'],
            assign: [{ type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' }],
            unassign: [],
          },
        }
      );
      expect(response).toHaveStatusCode(403);
      expect(response.body).toStrictEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden type [dashboard]',
      });
    });
  }
);
