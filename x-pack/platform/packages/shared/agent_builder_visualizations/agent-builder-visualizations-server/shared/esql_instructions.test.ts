/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlAdditionalInstructions } from './esql_instructions';

describe('buildEsqlAdditionalInstructions', () => {
  it('sizes @timestamp buckets with time-picker bounds and no timestamp WHERE', () => {
    const instructions = buildEsqlAdditionalInstructions();

    expect(instructions).toContain(
      'FROM logs | STATS count = COUNT() BY bucket = TBUCKET(100, ?_tstart, ?_tend)'
    );
    expect(instructions).not.toContain('TS logs-tsds');
    expect(instructions).toContain('Never write `TBUCKET(@timestamp, …)`');
    expect(instructions).toContain('No timestamp `WHERE`');
    expect(instructions).toContain('do not add `TRANGE`');
    expect(instructions).toContain('is-tsds="true"');
  });
});
