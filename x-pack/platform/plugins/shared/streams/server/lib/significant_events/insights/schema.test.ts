/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { insightsSchema } from './client/insight_tool';

describe('insightsSchema', () => {
  /**
   * The schema is inlined into the LLM prompt. We need to ensure it doesn't explode
   * in size when serialized (e.g., with reused: 'ref' producing excessive $defs).
   * This guards against regressions from z.toJSONSchema options changes.
   */
  it('serializes to reasonable size when inlined into prompt', () => {
    const serialized = JSON.stringify(insightsSchema);
    expect(JSON.parse(serialized)).toBeDefined(); // Valid JSON
    // Schema should stay compact; 10KB is a generous upper bound for this schema
    expect(serialized.length).toBeLessThan(10 * 1024);
  });

  it('produces expected schema structure', () => {
    expect(insightsSchema).toMatchSnapshot();
  });
});
