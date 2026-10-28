/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomResolutionRuleTypeName,
  MAX_CUSTOM_RULE_EXPRESSION_LENGTH,
  MAX_CUSTOM_RULE_NAMESPACES,
} from './constants';
import { CustomResolutionRuleType } from './saved_object';

interface TestSchema {
  validate(input: unknown): unknown;
}

interface TestModelVersion {
  schemas?: { create?: TestSchema; forwardCompatibility?: TestSchema };
}

describe('CustomResolutionRuleType', () => {
  const modelVersions = CustomResolutionRuleType.modelVersions as Record<number, TestModelVersion>;
  const createSchema = modelVersions[1].schemas?.create;
  const validAttributes = {
    name: 'Endpoint local users to AD',
    entityNamespaces: ['local', 'active_directory'],
    matchValue: 'TO_LOWER(user.name)',
    declineSameNamespaceDuplicates: true,
    enabled: false,
  };

  it('registers as a multiple-isolated type hidden from the saved objects HTTP APIs, with no mappings', () => {
    expect(CustomResolutionRuleType.name).toBe(CustomResolutionRuleTypeName);
    expect(CustomResolutionRuleType.namespaceType).toBe('multiple-isolated');
    expect(CustomResolutionRuleType.hiddenFromHttpApis).toBe(true);
    expect(CustomResolutionRuleType.mappings).toEqual({ dynamic: false, properties: {} });
  });

  it('accepts a rule with and without a filter', () => {
    expect(createSchema?.validate(validAttributes)).toEqual(validAttributes);
    const withFilter = { ...validAttributes, filter: 'NOT ENDS_WITH(user.name, "$")' };
    expect(createSchema?.validate(withFilter)).toEqual(withFilter);
  });

  it.each([
    ['no namespaces', { entityNamespaces: [] }],
    [
      'too many namespaces',
      {
        entityNamespaces: Array.from({ length: MAX_CUSTOM_RULE_NAMESPACES + 1 }, (_, i) => `n${i}`),
      },
    ],
    ['an oversized expression', { matchValue: 'a'.repeat(MAX_CUSTOM_RULE_EXPRESSION_LENGTH + 1) }],
    ['a missing enabled flag', { enabled: undefined }],
  ])('rejects %s', (_case, override) => {
    expect(() => createSchema?.validate({ ...validAttributes, ...override })).toThrow();
  });

  it('ignores unknown attributes when reading forward-compatible documents', () => {
    const forwardCompatibility = modelVersions[1].schemas?.forwardCompatibility;
    expect(forwardCompatibility?.validate({ ...validAttributes, future: 'x' })).toEqual(
      validAttributes
    );
  });
});
