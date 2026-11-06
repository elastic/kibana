/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchemaStrict, isConditionStrict } from './conditions';

describe('conditionSchemaStrict', () => {
  it('rejects filter conditions with unrecognized keys', () => {
    const input = { field: 'user.name', eq: 'user1', sdfsd: 'sdf' };

    expect(isConditionStrict(input)).toBe(false);
    expect(conditionSchemaStrict.safeParse(input).success).toBe(false);
  });
});
