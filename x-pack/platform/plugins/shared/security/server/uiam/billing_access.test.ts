/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { createBillingAccessChecker } from './billing_access';
import { uiamServiceMock } from './uiam_service.mock';

describe('createBillingAccessChecker', () => {
  const request = httpServerMock.createKibanaRequest();
  const billingCheck = {
    action: 'get',
    resource: { type: 'billing-details', organization_id: 'org-id' },
  };

  it('asks UIAM whether the user may read the organization billing details', async () => {
    const uiam = uiamServiceMock.create();
    uiam.checkAuthorization.mockResolvedValue({
      permitted: true,
      checks: [{ ...billingCheck, permitted: true }],
    });

    await expect(createBillingAccessChecker(() => uiam, 'org-id')(request)).resolves.toBe(true);
    expect(uiam.checkAuthorization).toHaveBeenCalledWith(request, [billingCheck]);
  });

  it('reports a denied check', async () => {
    const uiam = uiamServiceMock.create();
    uiam.checkAuthorization.mockResolvedValue({
      permitted: false,
      checks: [{ ...billingCheck, permitted: false }],
    });

    await expect(createBillingAccessChecker(() => uiam, 'org-id')(request)).resolves.toBe(false);
  });

  it('omits the organization when Kibana does not know it', async () => {
    const uiam = uiamServiceMock.create();
    uiam.checkAuthorization.mockResolvedValue({ permitted: true, checks: [] });

    await createBillingAccessChecker(() => uiam, undefined)(request);

    expect(uiam.checkAuthorization).toHaveBeenCalledWith(request, [
      { action: 'get', resource: { type: 'billing-details' } },
    ]);
  });

  it('fails when the UIAM service has not started', async () => {
    await expect(createBillingAccessChecker(() => undefined, 'org-id')(request)).rejects.toThrow(
      'UIAM service is not available.'
    );
  });
});
