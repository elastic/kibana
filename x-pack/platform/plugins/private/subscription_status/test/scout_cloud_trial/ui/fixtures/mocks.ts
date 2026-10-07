/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const CLOUD_BILLING_ADMIN_ROLE = '_ec_billing_admin';

/**
 * HACK: fakes the Cloud billing admin role by rewriting the current user response in the browser.
 *
 * There is no supported way to grant this role in a Scout test. Cloud assigns it at the
 * organization level, and with UIAM a Scout user only carries the single project role it logged
 * in with, so role mappings (used by the stateful cloud_links tests) don't apply. Replace this
 * with a real role once Scout can log in with extra Cloud roles.
 */
export const mockBillingAdminRole = async (page: ScoutPage) => {
  await page.route('**/internal/security/me', async (route) => {
    const response = await route.fetch();
    const user: { roles: string[] } = await response.json();
    await route.fulfill({
      response,
      json: { ...user, roles: [...user.roles, CLOUD_BILLING_ADMIN_ROLE] },
    });
  });
};
