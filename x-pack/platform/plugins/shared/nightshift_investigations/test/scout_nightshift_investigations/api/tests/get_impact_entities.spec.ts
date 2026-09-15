/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  apiTest,
  deleteInvestigation,
  getImpactEntities,
  INVESTIGATIONS_READ_ROLE,
  NO_AGENT_BUILDER_ROLE,
  seedInvestigation,
  seedTimeWindow,
  uniqueId,
} from '../fixtures';

apiTest.describe(
  'GET /internal/nightshift/investigations/_impact_entities',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const IDS = [uniqueId('impact-entities-in-range'), uniqueId('impact-entities-out-of-range')];
    const times = seedTimeWindow(2);
    const checkoutName = uniqueId('checkout');
    const outsideName = uniqueId('outside');
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ kbnClient, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE));

      await seedInvestigation(kbnClient, {
        id: IDS[0],
        created_at: times.iso({ day: 1 }),
        impact: {
          entities: [
            { name: checkoutName, type: 'service' },
            { name: checkoutName, type: 'service' },
            { name: checkoutName, type: 'host' },
            { name: 'database' },
          ],
        },
      });
      await seedInvestigation(kbnClient, {
        id: IDS[1],
        created_at: times.iso({ day: 3 }),
        impact: { entities: [{ name: outsideName, type: 'service' }] },
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of IDS) {
        await deleteInvestigation(kbnClient, id);
      }
    });

    apiTest(
      'returns distinct entity pairs within the created date bounds',
      async ({ apiClient }) => {
        const response = await getImpactEntities(apiClient, cookieHeader, {
          query: times.createdRange,
        });
        expect(response).toHaveStatusCode(200);
        const impactEntities = response.body.impact_entities as Array<{
          name: string;
          type?: string;
        }>;
        expect(impactEntities).toStrictEqual(
          expect.arrayContaining([
            { name: checkoutName, type: 'host' },
            { name: checkoutName, type: 'service' },
            { name: 'database' },
          ])
        );
        expect(
          impactEntities.some(({ name, type }) => name === outsideName && type === 'service')
        ).toBe(false);
      }
    );

    apiTest('returns 403 for a user without agentBuilder:read', async ({ apiClient, samlAuth }) => {
      const unauthorized = await samlAuth.asInteractiveUser(NO_AGENT_BUILDER_ROLE);
      const response = await getImpactEntities(apiClient, unauthorized.cookieHeader);
      expect(response).toHaveStatusCode(403);
    });
  }
);
