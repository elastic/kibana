/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityStoreIdType, impactEntityFlyoutType } from './open_impact_entity';

describe('entityStoreIdType', () => {
  it('reads the type off an Entity Store id', () => {
    expect(entityStoreIdType('user:cfo@corp')).toBe('user');
    expect(entityStoreIdType('host:ws-finance-04')).toBe('host');
    expect(entityStoreIdType('service:orders-api')).toBe('service');
  });

  it('is undefined for a plain name or an unknown prefix', () => {
    expect(entityStoreIdType('ws-finance-04')).toBeUndefined();
    expect(entityStoreIdType('generic:thing')).toBeUndefined();
    expect(entityStoreIdType('host:')).toBeUndefined();
  });
});

describe('impactEntityFlyoutType', () => {
  it('prefers the Entity Store id over the declared type', () => {
    expect(impactEntityFlyoutType({ id: 'host:ws-finance-04', type: 'user' })).toBe('host');
  });

  it('falls back to the declared type for an entity recorded by name', () => {
    expect(impactEntityFlyoutType({ id: 'ws-finance-04', type: 'host' })).toBe('host');
    expect(impactEntityFlyoutType({ id: 'jsmith', type: 'User' })).toBe('user');
    expect(impactEntityFlyoutType({ id: 'okta-sso', type: 'service' })).toBe('service');
  });

  it('is undefined when neither the id nor the type names a flyout', () => {
    expect(impactEntityFlyoutType({ id: 'checkout-service' })).toBeUndefined();
    expect(impactEntityFlyoutType({ id: 'checkout-service', type: 'generic' })).toBeUndefined();
  });
});
