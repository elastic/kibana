/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlInstructions } from './instructions_template';

describe('getEsqlInstructions', () => {
  it('includes JOIN limitations', () => {
    const instructions = getEsqlInstructions();
    expect(instructions).toContain('JOIN limitations');
    expect(instructions).toContain('only supported with lookup indices');
    expect(instructions).toContain('NOT with regular indices');
  });

  it('uses default limits when no params are provided', () => {
    const instructions = getEsqlInstructions();
    expect(instructions).toContain('LIMIT 100');
    expect(instructions).toContain('LIMIT 250');
  });

  it('uses custom limits when params are provided', () => {
    const instructions = getEsqlInstructions({ defaultLimit: 50, maxAllLimit: 500 });
    expect(instructions).toContain('LIMIT 50');
    expect(instructions).toContain('LIMIT 500');
    expect(instructions).not.toContain('LIMIT 100');
    expect(instructions).not.toContain('LIMIT 250');
  });
});
