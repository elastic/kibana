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
  AGENTIC_INVESTIGATIONS_READ_ROLE,
  AGENTIC_INVESTIGATIONS_MANAGE_ROLE,
  listInvestigations,
  upsertInvestigation,
  uniqueId,
} from '../fixtures';

/**
 * Tests for the impactedEntityName query parameter on
 * GET /internal/investigations/investigations.
 *
 * The filter performs an exact keyword match on the `impactedEntities.name` field.
 * Investigations are seeded via the POST (upsert) route so each test has
 * deterministic data in the shared index.
 */
apiTest.describe(
  'GET /internal/investigations/investigations?impactedEntityName',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Use globally unique entity names so this suite's data is isolated from
    // any other investigations already in the shared index.
    const checkoutEntity = uniqueId('checkout-service');
    const paymentEntity = uniqueId('payment-service');

    const CHECKOUT_ID = uniqueId('entity-filter-checkout');
    const PAYMENT_ID = uniqueId('entity-filter-payment');
    const MULTI_ID = uniqueId('entity-filter-multi');
    const NONE_ID = uniqueId('entity-filter-none');

    let readCookieHeader: Record<string, string>;
    let manageCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      ({ cookieHeader: readCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_READ_ROLE
      ));
      ({ cookieHeader: manageCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_MANAGE_ROLE
      ));

      // Investigation affecting only the checkout entity.
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: CHECKOUT_ID,
        status: 'running',
        impactedEntities: [{ name: checkoutEntity, nameText: checkoutEntity }],
      });

      // Investigation affecting only the payment entity.
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: PAYMENT_ID,
        status: 'running',
        impactedEntities: [{ name: paymentEntity, nameText: paymentEntity }],
      });

      // Investigation affecting both entities.
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: MULTI_ID,
        status: 'running',
        impactedEntities: [
          { name: checkoutEntity, nameText: checkoutEntity },
          { name: paymentEntity, nameText: paymentEntity },
        ],
      });

      // Investigation with no impacted entities.
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: NONE_ID,
        status: 'running',
        impactedEntities: [],
      });
    });

    apiTest(
      'returns only investigations that have the specified entity as an impacted entity',
      async ({ apiClient }) => {
        const response = await listInvestigations(apiClient, readCookieHeader, {
          query: `impactedEntityName=${encodeURIComponent(checkoutEntity)}`,
        });
        expect(response).toHaveStatusCode(200);

        const ids = response.body.items.map((r: { id: string }) => r.id);
        expect(ids).toContain(CHECKOUT_ID);
        expect(ids).toContain(MULTI_ID);
        expect(ids).not.toContain(PAYMENT_ID);
        expect(ids).not.toContain(NONE_ID);
      }
    );

    apiTest(
      'returns different investigations when filtering by a different entity name',
      async ({ apiClient }) => {
        const response = await listInvestigations(apiClient, readCookieHeader, {
          query: `impactedEntityName=${encodeURIComponent(paymentEntity)}`,
        });
        expect(response).toHaveStatusCode(200);

        const ids = response.body.items.map((r: { id: string }) => r.id);
        expect(ids).toContain(PAYMENT_ID);
        expect(ids).toContain(MULTI_ID);
        expect(ids).not.toContain(CHECKOUT_ID);
        expect(ids).not.toContain(NONE_ID);
      }
    );

    apiTest(
      'returns no matching investigations for an entity name that was never used',
      async ({ apiClient }) => {
        const unknownEntity = uniqueId('unknown-entity-xyz');
        const response = await listInvestigations(apiClient, readCookieHeader, {
          query: `impactedEntityName=${encodeURIComponent(unknownEntity)}`,
        });
        expect(response).toHaveStatusCode(200);

        const ids = response.body.items.map((r: { id: string }) => r.id);
        expect(ids).not.toContain(CHECKOUT_ID);
        expect(ids).not.toContain(PAYMENT_ID);
        expect(ids).not.toContain(MULTI_ID);
        expect(ids).not.toContain(NONE_ID);
      }
    );

    apiTest(
      'returns 400 when the impactedEntityName value exceeds the 512-character maximum',
      async ({ apiClient }) => {
        const response = await listInvestigations(apiClient, readCookieHeader, {
          query: `impactedEntityName=${'x'.repeat(513)}`,
        });
        expect(response).toHaveStatusCode(400);
      }
    );
  }
);
