/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseStepDefinition } from './create_case';
import { connectorTypesOptions } from './case_enum_options';

describe('createCaseStepDefinition', () => {
  it('returns a public step definition with expected metadata', () => {
    expect(createCaseStepDefinition.id).toBe('cases.createCase');
    expect(createCaseStepDefinition.category).toBe('kibana');
    expect(createCaseStepDefinition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('configures connector-id config selector', () => {
    expect(
      createCaseStepDefinition.editorHandlers?.config?.['connector-id']?.connectorIdSelection
    ).toEqual({
      connectorTypes: connectorTypesOptions,
      enableCreation: false,
    });
  });
});
