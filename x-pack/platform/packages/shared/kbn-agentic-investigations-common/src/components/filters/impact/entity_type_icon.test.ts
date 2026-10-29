/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityTypeIcon } from './entity_type_icon';

describe('entityTypeIcon', () => {
  it('maps known entity types, case-insensitively', () => {
    expect(entityTypeIcon('host')).toBe('compute');
    expect(entityTypeIcon('User')).toBe('user');
    expect(entityTypeIcon('service')).toBe('gear');
  });

  it('falls back to a neutral icon for unknown types and none when untyped', () => {
    expect(entityTypeIcon('banana')).toBe('node');
    expect(entityTypeIcon(undefined)).toBeUndefined();
  });
});
