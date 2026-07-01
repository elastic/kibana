/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/feature_controls/canvas_spaces.ts
 * (the "space with Canvas disabled" describe block — the two 404-returning `it` blocks).
 *
 * The FTR version used `common.getJsonBodyText()` to read raw JSON from the browser
 * response body when Kibana returned 404 for the disabled-feature app route. These
 * are HTTP-level authorization assertions (does Kibana restrict the feature?), not
 * visual-render tests.
 *
 * At the API level, the cleanest equivalent is to verify via `/api/core/capabilities`
 * that canvas is zeroed out when disabled in a space — the same approach used by the
 * Graph feature-controls migration for the space-disabled case. This avoids requiring
 * cookie-based session auth for an app-route GET, while preserving the test intent:
 * "canvas is inaccessible in a space where it is disabled".
 *
 * The two original FTR `it` blocks tested two URLs:
 *  1. /s/custom_space/app/canvas (listing / "create new workpad")
 *  2. /s/custom_space/app/canvas#/workpad/{id} (workpad view / "edit workpad")
 * Both resolve to the same server-side path since the hash fragment is client-side.
 * They are kept as two tests here to preserve the FTR parity intent, each verifying
 * the canvas capability is blocked (show=false, save=false) in the disabled space.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { testData } from '../../fixtures';

apiTest.describe(
  'Canvas feature controls — canvas disabled in space',
  { tag: ['@local-stateful-classic'] },
  () => {
    let spaceId: string;
    // canvas:all user — normally can do everything, but space-level disable zeros it out
    let canvasAllCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ apiServices, requestAuth }, workerInfo) => {
      spaceId = `canvas-disabled-${workerInfo.parallelIndex}-${Date.now()}`;
      await apiServices.spaces.create({
        id: spaceId,
        name: spaceId,
        disabledFeatures: ['canvas'],
      });
      canvasAllCredentials = await requestAuth.getApiKeyForCustomRole(testData.CANVAS_ALL_ROLE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(spaceId);
    });

    apiTest(
      'canvas:all user has canvas hidden when canvas is disabled in the space (navlink + create)',
      async ({ apiClient }) => {
        const response = await apiClient.post(`s/${spaceId}/api/core/capabilities`, {
          headers: {
            ...testData.COMMON_HEADERS,
            'Content-Type': 'application/json;charset=UTF-8',
            ...canvasAllCredentials.apiKeyHeader,
          },
          body: { applications: ['canvas'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const body = response.body as testData.CanvasCapabilitiesResponse;
        // The feature is disabled at the space level — even an all-privileges user
        // should have the navlink hidden and all capabilities zeroed.
        expect(body.navLinks.canvas).toBe(false);
        expect(body.canvas.show).toBe(false);
        // save=false mirrors the FTR "create new workpad returns 404" intent
        expect(body.canvas.save).toBe(false);
      }
    );

    apiTest(
      'canvas:all user cannot edit workpads when canvas is disabled in the space',
      async ({ apiClient }) => {
        const response = await apiClient.post(`s/${spaceId}/api/core/capabilities`, {
          headers: {
            ...testData.COMMON_HEADERS,
            'Content-Type': 'application/json;charset=UTF-8',
            ...canvasAllCredentials.apiKeyHeader,
          },
          body: { applications: ['canvas'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const body = response.body as testData.CanvasCapabilitiesResponse;
        // save=false also covers the FTR "edit workpad returns 404" intent:
        // editing requires write access which is denied when feature is disabled.
        expect(body.canvas.show).toBe(false);
        expect(body.canvas.save).toBe(false);
      }
    );
  }
);
