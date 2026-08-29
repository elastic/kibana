/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlAdditionalInstructions } from './esql_instructions';

describe('buildEsqlAdditionalInstructions', () => {
  it('tells the model not to collapse a time series into overall avg/min/max', () => {
    const instructions = buildEsqlAdditionalInstructions();

    expect(instructions).toContain('Time-series statistics');
    expect(instructions).toContain('Do **not** add a second `STATS`');
    expect(instructions).toContain('Lens legend statistics');
  });
});
