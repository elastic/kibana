/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUpdateCasesStepDefinition } from './update_cases';

describe('createUpdateCasesStepDefinition', () => {
  it('returns a public step definition with expected metadata', () => {
    const definition = createUpdateCasesStepDefinition();

    expect(definition.id).toBe('cases.updateCases');
    expect(definition.actionsMenuGroup).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });
});
