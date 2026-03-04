/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCreateCaseStepDefinition } from './create_case';
import { connectorTypesOptions } from './case_enum_options';

describe('createCreateCaseStepDefinition', () => {
  it('returns a public step definition with expected metadata', () => {
    const definition = createCreateCaseStepDefinition();

    expect(definition.id).toBe('cases.createCase');
    expect(definition.actionsMenuGroup).toBe('kibana');
    expect(definition.documentation?.examples?.length).toBeGreaterThan(0);
  });

  it('configures connector-id config selector', () => {
    const definition = createCreateCaseStepDefinition();

    expect(definition.editorHandlers?.config?.['connector-id']?.connectorIdSelection).toEqual({
      connectorTypes: connectorTypesOptions,
      enableCreation: false,
    });
  });
});
