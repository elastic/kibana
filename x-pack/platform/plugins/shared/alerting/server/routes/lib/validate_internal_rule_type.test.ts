/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateInternalRuleType } from './validate_internal_rule_type';

describe('validateInternalRuleTypes', () => {
  const ruleTypeId = 'internal';
  const ruleTypes = new Map();
  const operationText = 'edit';

  beforeEach(() => {
    ruleTypes.clear();
  });

  it('should throw an error for invalid rule types', async () => {
    ruleTypes.set(ruleTypeId, { internallyManaged: true });

    expect(() =>
      validateInternalRuleType({ ruleTypeId, ruleTypes, operationText })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot edit rule of type \\"internal\\" because it is internally managed."`
    );
  });

  it('should not throw an error for valid rule types', async () => {
    ruleTypes.set(ruleTypeId, { internallyManaged: false });

    expect(() =>
      validateInternalRuleType({ ruleTypeId, ruleTypes, operationText })
    ).not.toThrowError();
  });
});
