/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { createHelpers } from '../fixtures/helpers';

apiTest.describe('Notification Center - mark all read', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;
  const h = createHelpers(() => cookieHeader);

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
  });

  apiTest('advances the read_all_before marker and returns it', async ({ apiClient }) => {
    const response = await h.markAllRead(apiClient);
    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.read_all_before).toBe('string');
    expect(Number.isNaN(Date.parse(response.body.read_all_before))).toBe(false);
  });
});
