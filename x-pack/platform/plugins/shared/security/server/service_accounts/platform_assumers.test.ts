/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlatformAssumerServiceAccountIds, PLATFORM_ASSUMERS } from './platform_assumers';

describe('platform assumers', () => {
  it('lists every assumer a caller may name', () => {
    expect(PLATFORM_ASSUMERS).toEqual(['relay', 'sandbox']);
  });

  it('maps each assumer to the id of its platform service account', () => {
    expect(getPlatformAssumerServiceAccountIds(['relay', 'sandbox'])).toEqual([
      'relay-service',
      'sandbox-api',
    ]);
  });
});
