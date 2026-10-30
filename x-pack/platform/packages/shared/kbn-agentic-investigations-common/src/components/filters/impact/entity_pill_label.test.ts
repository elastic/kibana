/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityPillAriaLabel, entityPillLabel } from './entity_pill_label';

describe('entityPillLabel', () => {
  it('shows the display name and leaves an id that has no name unchanged', () => {
    expect(entityPillLabel({ entityId: 'host:572750b8', name: 'SRVWIN01' })).toBe('SRVWIN01');
    expect(entityPillLabel({ entityId: 'user:it.admin@572750b8@local' })).toBe(
      'user:it.admin@572750b8@local'
    );
    expect(entityPillLabel({ entityId: 'checkout' })).toBe('checkout');
  });
});

describe('entityPillAriaLabel', () => {
  it('includes the id when the visible label is a display name', () => {
    expect(entityPillAriaLabel({ entityId: 'host:572750b8', name: 'SRVWIN01' })).toBe(
      'SRVWIN01 (host:572750b8)'
    );
  });

  it('is the id when that is already the label', () => {
    expect(entityPillAriaLabel({ entityId: 'checkout', name: 'checkout' })).toBe('checkout');
    expect(entityPillAriaLabel({ entityId: 'checkout' })).toBe('checkout');
  });
});
