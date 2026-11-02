/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';
import {
  cleanKibanaSavedObjects,
  expectedSuiteUsageCounters,
  getApiDeprecations,
  getDeprecations,
  getDeprecationsCounters,
} from '../fixtures/helpers';

// The original FTR suite split this scenario into 7 sequential `it` blocks
// (with `this.bail(true)`) that shared mutable state — each step depended on
// the previous step's side effects (deprecation counters, saved objects,
// mark-as-resolved state). Scout's `apiTest` does not offer an equivalent
// bail-on-first-failure ordering primitive for cross-test state, so the
// migration consolidates those steps into a single linear test that walks the
// same scenario top-to-bottom. The numbered comments below mark each step.
apiTest.describe.skip(
  'Upgrade Assistant API deprecations',
  { tag: testData.UPGRADE_ASSISTANT_INTEGRATION_TAGS },
  () => {
    apiTest(
      'tracks deprecated API calls and resolution state',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...testData.COMMON_HEADERS, ...cookieHeader };

        // Step 1: clean saved objects and assert no deprecations exist at baseline
        await cleanKibanaSavedObjects(esClient);

        const initialDeprecations = await getDeprecations(apiClient, cookieHeader);
        expect(initialDeprecations).toHaveLength(0);

        // Step 2: hit the removed route and verify one deprecation is tracked with the correct shape
        const removedRouteResponse = await apiClient.get(testData.ROUTES.removedRoute, {
          headers,
        });
        expect(removedRouteResponse).toHaveStatusCode(200);

        await expect
          .poll(async () => (await getDeprecations(apiClient, cookieHeader)).length)
          .toBe(1);

        const deprecationsAfterRemovedRoute = await getDeprecations(apiClient, cookieHeader);
        const markAsResolvedApi =
          deprecationsAfterRemovedRoute[0].correctiveActions?.mark_as_resolved_api;
        expect(markAsResolvedApi).toBeDefined();
        expect(typeof markAsResolvedApi?.timestamp).toBe('string');

        expect(deprecationsAfterRemovedRoute[0]).toStrictEqual({
          apiId: testData.REMOVED_ROUTE_API_ID,
          correctiveActions: {
            mark_as_resolved_api: {
              api_id: testData.REMOVED_ROUTE_API_ID,
              timestamp: markAsResolvedApi?.timestamp,
              route_method: 'get',
              route_path: '/api/routing_example/d/removed_route',
              route_version: undefined,
            },
          },
          deprecationType: 'api',
          domainId: testData.API_DEPRECATIONS_DOMAIN_ID,
          documentationUrl: 'https://fake.url',
          level: 'warning',
          message:
            'The API [GET /api/routing_example/d/removed_route] is deprecated and will be removed in a future version of Kibana. Please use [GET /api/routing_example/d/replacement_route] instead.',
          title: 'Deprecated API: GET /api/routing_example/d/removed_route',
        });

        // Step 3: hit the internal versioned route and verify two deprecations are tracked in order
        const internalVersionedRouteResponse = await apiClient.get(
          testData.ROUTES.internalVersionedRoute,
          { headers }
        );
        expect(internalVersionedRouteResponse).toHaveStatusCode(200);

        await expect
          .poll(async () => (await getDeprecations(apiClient, cookieHeader)).length)
          .toBe(2);

        const deprecationsAfterInternalRoute = await getDeprecations(apiClient, cookieHeader);
        expect(deprecationsAfterInternalRoute.map(({ apiId }) => apiId)).toStrictEqual([
          testData.INTERNAL_VERSIONED_ROUTE_API_ID,
          testData.REMOVED_ROUTE_API_ID,
        ]);

        // Step 4: mark the removed-route deprecation as resolved; hitting the route again with an
        // internal origin should not re-increment the counter, leaving only 1 deprecation
        const markAsResolvedResponse = await apiClient.post(testData.ROUTES.markAsResolved, {
          headers,
          body: markAsResolvedApi,
        });
        expect(markAsResolvedResponse).toHaveStatusCode(200);

        const resolvedRouteResponse = await apiClient.get(
          testData.ROUTES.removedRouteWithInternalOrigin,
          { headers }
        );
        expect(resolvedRouteResponse).toHaveStatusCode(200);

        await expect
          .poll(async () => (await getDeprecations(apiClient, cookieHeader)).length)
          .toBe(1);

        const deprecationsAfterResolution = await getDeprecations(apiClient, cookieHeader);
        expect(deprecationsAfterResolution[0].apiId).toBe(testData.INTERNAL_VERSIONED_ROUTE_API_ID);

        // Step 5: hit the versioned route, then verify the /deprecations endpoint reports exactly 1
        // api-type deprecation across the full deprecations payload
        const versionedRouteResponse = await apiClient.get(testData.ROUTES.versionedRoute, {
          headers,
        });
        expect(versionedRouteResponse).toHaveStatusCode(200);

        const finalDeprecationsResponse = await apiClient.get(testData.ROUTES.deprecations, {
          headers,
        });
        expect(finalDeprecationsResponse).toHaveStatusCode(200);
        expect(
          getApiDeprecations(
            finalDeprecationsResponse.body.deprecations as Array<{
              deprecationType: string;
            }>
          )
        ).toHaveLength(1);

        // Step 6: verify the upgrade assistant status reports ready for upgrade
        const statusResponse = await apiClient.get(testData.ROUTES.upgradeAssistantStatus, {
          headers,
        });
        expect(statusResponse).toHaveStatusCode(200);
        expect(statusResponse.body.readyForUpgrade).toBe(true);

        // Step 7: verify the final usage counters accumulated across all steps above
        expect(await getDeprecationsCounters(esClient)).toStrictEqual(expectedSuiteUsageCounters);
      }
    );
  }
);
