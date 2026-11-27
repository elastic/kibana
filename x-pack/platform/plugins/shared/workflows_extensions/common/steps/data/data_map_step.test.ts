/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigSchema, InputSchema } from './data_map_step';

describe('data.map form hints', () => {
  it('asks the step form to show Fields as name/value rows', () => {
    expect(InputSchema.shape.fields.meta()).toMatchObject({ keyValue: true });
  });

  it('asks the step form to open Items on earlier data, and does not make it required', () => {
    expect(ConfigSchema.shape.items.meta()).toMatchObject({ advanced: false, preferData: true });
    // The form treats a field that accepts `undefined` as optional (no "required" hint).
    expect(ConfigSchema.shape.items.safeParse(undefined).success).toBe(true);
  });
});
