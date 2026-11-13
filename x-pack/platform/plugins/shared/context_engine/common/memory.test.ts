/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takesMemories } from './memory';

describe('takesMemories', () => {
  it('takes memories for an AI index that is not managed, whatever memory_enabled it holds', () => {
    expect(takesMemories({ managed: false })).toBe(true);
    expect(takesMemories({ managed: false, memory_enabled: false })).toBe(true);
  });

  it('takes memories for a managed AI index unless its registration opts out', () => {
    expect(takesMemories({ managed: true })).toBe(true);
    expect(takesMemories({ managed: true, memory_enabled: true })).toBe(true);
    expect(takesMemories({ managed: true, memory_enabled: false })).toBe(false);
  });
});
