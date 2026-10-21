/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BillingAccessChecker } from '@kbn/cloud-plugin/server';

import type { UiamServicePublic } from './uiam_service';

/** UIAM resource and action a user must be allowed to see Cloud billing. */
export const UIAM_BILLING_DETAILS_RESOURCE_TYPE = 'billing-details';
export const UIAM_BILLING_DETAILS_READ_ACTION = 'get';

/**
 * Builds the checker the Cloud plugin calls to learn whether a user may read the organization's
 * billing details. The UIAM service only exists once the plugin has started, so it is looked up
 * lazily.
 */
export function createBillingAccessChecker(
  getUiamService: () => UiamServicePublic | undefined,
  organizationId: string | undefined
): BillingAccessChecker {
  return async (request) => {
    const uiam = getUiamService();
    if (!uiam) {
      throw new Error('UIAM service is not available.');
    }

    const { permitted } = await uiam.checkAuthorization(request, [
      {
        action: UIAM_BILLING_DETAILS_READ_ACTION,
        resource: {
          type: UIAM_BILLING_DETAILS_RESOURCE_TYPE,
          ...(organizationId ? { organization_id: organizationId } : {}),
        },
      },
    ]);
    return permitted;
  };
}
