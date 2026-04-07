/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateCasesStepDefinition } from './simple_steps';

describe('createUpdateCasesStepDefinition', () => {
  it('returns a public step definition with expected metadata', () => {
    expect(updateCasesStepDefinition.id).toBe('cases.updateCases');
    expect(updateCasesStepDefinition.category).toBe('kibana');
    expect(updateCasesStepDefinition.documentation?.examples?.length).toBeGreaterThan(0);
  });
});
