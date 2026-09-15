/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/feature_controls/canvas_security.ts
 * (the "no canvas privileges" describe block — `it('returns a 403')` and
 *  `it('create new workpad returns a 403')`).
 *
 * The FTR assertions used browser-rendered error pages (error.expectForbidden()).
 * At the HTTP / authorization level, the equivalent check is that a user
 * without the canvas feature has canvas capabilities zeroed out.
 * We use POST /api/core/capabilities — the same approach as the Graph feature
 * controls migration — to verify the privilege is correctly denied.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { testData } from '../../fixtures';

apiTest.describe(
  'Canvas feature controls — no canvas privileges',
  { tag: ['@local-stateful-classic'] },
  () => {
    let noCanvasCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      noCanvasCredentials = await requestAuth.getApiKeyForCustomRole(testData.NO_CANVAS_ROLE);
    });

    apiTest(
      'user without canvas privileges has canvas capabilities zeroed out (hidden navlink)',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/core/capabilities', {
          headers: {
            ...testData.COMMON_HEADERS,
            'Content-Type': 'application/json;charset=UTF-8',
            ...noCanvasCredentials.apiKeyHeader,
          },
          body: { applications: ['canvas'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const body = response.body as testData.CanvasCapabilitiesResponse;
        expect(body.navLinks.canvas).toBe(false);
        expect(body.catalogue.canvas).toBe(false);
        expect(body.canvas.show).toBe(false);
        expect(body.canvas.save).toBe(false);
      }
    );

    apiTest(
      'user without canvas privileges cannot create workpads (canvas capabilities absent)',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/core/capabilities', {
          headers: {
            ...testData.COMMON_HEADERS,
            'Content-Type': 'application/json;charset=UTF-8',
            ...noCanvasCredentials.apiKeyHeader,
          },
          body: { applications: ['canvas'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const body = response.body as testData.CanvasCapabilitiesResponse;
        // save=false means "create new workpad" is not permitted
        expect(body.canvas.save).toBe(false);
      }
    );
  }
);
