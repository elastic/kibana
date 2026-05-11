/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from './query_helpers';

describe('query_helpers', () => {
  it('kqlQuery accepts leading wildcards in the value when allowLeadingWildcards is true', () => {
    const kql = 'deviceCustomString3: *APP*';
    expect(() => kqlQuery(kql, { allowLeadingWildcards: true })).not.toThrow();
    const [dsl] = kqlQuery(kql, { allowLeadingWildcards: true });
    expect(dsl).toBeDefined();
    expect(typeof dsl).toBe('object');
  });
});
