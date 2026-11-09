/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import rison from '@kbn/rison';

import { apiTest, testData } from '../fixtures';

/**
 * The endpoint aggregates every `logs-*-*` data stream, so this suite deliberately
 * queries a window of its own that no other suite writes into. That keeps the
 * "nothing was reported" assertion independent of what else the cluster holds.
 */
const START = '2023-12-13T18:00:00.000Z';
const END = '2023-12-13T18:01:00.000Z';

const DEGRADED_DOCS_URL = `${testData.API.DEGRADED_DOCS}?${new URLSearchParams({
  types: rison.encodeArray(['logs']),
  start: START,
  end: END,
}).toString()}`;

apiTest.describe(
  'Dataset quality - degraded docs without log documents',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('returns stats correctly', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(DEGRADED_DOCS_URL, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.degradedDocs).toHaveLength(0);
    });
  }
);
