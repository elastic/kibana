/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCasesStepDefinition } from './find_cases';

describe('findCasesStepDefinition', () => {
  it('returns a public step definition with expected metadata', () => {
    expect(findCasesStepDefinition.id).toBe('cases.findCases');
    expect(findCasesStepDefinition.category).toBe('kibana');
    expect(findCasesStepDefinition.documentation?.examples?.length).toBeGreaterThan(0);
  });
});
