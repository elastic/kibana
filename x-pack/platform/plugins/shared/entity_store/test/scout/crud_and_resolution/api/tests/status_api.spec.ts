/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../../common/fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';
import { clearEntityStoreIndices } from '../../../common/fixtures/helpers';

interface StatusEngineWithNonPriority {
  type: string;
  nonPriority: {
    status: string | null;
    error: unknown;
    lastExecutionTimestamp?: string;
    samplingRate: number | null;
  };
}

apiTest.describe('Entity Store Status API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiClient, kbnClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(response.statusCode);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
    await clearEntityStoreIndices(esClient);
  });

  apiTest(
    'hides non-priority internal config and cursor state from the public response',
    async ({ apiClient }) => {
      const response = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(response.statusCode).toBe(200);
      expect(response.body.engines.length).toBeGreaterThan(0);

      for (const engine of response.body.engines) {
        // Internal config and cursor state must never appear in the public response. The raw
        // nonPriorityStatus/nonPriorityError fields are reported through the `nonPriority` block
        // instead of at the top level.
        expect('nonPriorityLogExtractionConfig' in engine).toBe(false);
        expect('nonPriorityLogExtractionState' in engine).toBe(false);
        expect('nonPriorityStatus' in engine).toBe(false);
        expect('nonPriorityError' in engine).toBe(false);
      }
    }
  );

  apiTest('reports a nonPriority block only for types that run one', async ({ apiClient }) => {
    const response = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);

    // `user` is the only type with a priority extraction gate today.
    const withBlock: StatusEngineWithNonPriority[] = response.body.engines.filter(
      (engine: { nonPriority?: unknown }) => 'nonPriority' in engine
    );
    expect(withBlock.map(({ type }) => type)).toStrictEqual(['user']);

    // Assert the shape, not the values: this suite accepts an already-installed store, so a
    // shared deployment may have configured the user engine before the test ran.
    // lastExecutionTimestamp is omitted until the first run, so it is not part of the contract.
    const [{ nonPriority }] = withBlock;
    expect('status' in nonPriority).toBe(true);
    expect('error' in nonPriority).toBe(true);
    expect('samplingRate' in nonPriority).toBe(true);
  });
});
