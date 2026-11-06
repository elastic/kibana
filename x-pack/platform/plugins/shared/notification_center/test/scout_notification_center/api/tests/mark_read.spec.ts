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

apiTest.describe('Notification Center - mark read', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;
  const h = createHelpers(() => cookieHeader);

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
  });

  apiTest('marks a notification read for the current user', async ({ apiClient }) => {
    const response = await h.markRead(apiClient, {
      notification_id: 'inference:modelStatus:model-1',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ success: true });
  });

  apiTest('rejects a body without a notification_id', async ({ apiClient }) => {
    expect(await h.markRead(apiClient, {})).toHaveStatusCode(400);
  });

  apiTest('rejects an empty notification_id', async ({ apiClient }) => {
    expect(await h.markRead(apiClient, { notification_id: '' })).toHaveStatusCode(400);
  });

  apiTest('rejects a notification_id longer than the 512-char bound', async ({ apiClient }) => {
    expect(await h.markRead(apiClient, { notification_id: 'x'.repeat(513) })).toHaveStatusCode(400);
  });

  apiTest('rejects an unknown field', async ({ apiClient }) => {
    expect(await h.markRead(apiClient, { notification_id: 'valid', extra: true })).toHaveStatusCode(
      400
    );
  });
});
