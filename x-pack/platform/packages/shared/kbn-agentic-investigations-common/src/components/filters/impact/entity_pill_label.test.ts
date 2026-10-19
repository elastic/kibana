/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityPillLabel } from './entity_pill_label';

describe('entityPillLabel', () => {
  it('prefers the stored display name over the entity id', () => {
    expect(entityPillLabel({ entityId: 'host:572750b8', name: 'SRVWIN01' })).toBe('SRVWIN01');
    expect(
      entityPillLabel({
        entityId: 'user:Administrator@572750b8@local',
        name: 'Administrator@SRVWIN01',
      })
    ).toBe('Administrator@SRVWIN01');
  });

  it('drops the type prefix when no name was stored', () => {
    expect(entityPillLabel({ entityId: 'host:web-01' })).toBe('web-01');
    expect(entityPillLabel({ entityId: 'service:orders-api' })).toBe('orders-api');
    expect(entityPillLabel({ entityId: 'user:jane@acme.com@okta' })).toBe('jane@acme.com@okta');
  });

  it('keeps only the user name of a local entity id', () => {
    expect(entityPillLabel({ entityId: 'user:it.admin@572750b8@local' })).toBe('it.admin');
  });

  it('leaves an id that is already a name unchanged', () => {
    expect(entityPillLabel({ entityId: 'checkout' })).toBe('checkout');
  });
});
