/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryRuleType } from '../../rule_type_registry';
import { nodeBuilder, toKqlExpression } from '@kbn/es-query';
import {
  combineFiltersWithInternalRuleTypeFilter,
  constructIgnoreInternalRuleTypesFilter,
} from './construct_ignore_internal_rule_type_filters';

describe('constructIgnoreInternalRuleTypesFilter', () => {
  // @ts-expect-error: not all properties are needed for this test
  const ruleTypes: Map<string, RegistryRuleType> = new Map([
    ['internal-type', { id: 'internal-type', name: 'Internal Type', internallyManaged: true }],
    [
      'internal-type-2',
      { id: 'internal-type-2', name: 'Internal Type 2', internallyManaged: true },
    ],
    [
      'non-internal-type',
      { id: 'non-internal-type', name: 'Non Internal Type', internallyManaged: false },
    ],
  ]);

  test('should construct a KQL filter for internal rule types ignoring non-internal types', () => {
    const filter = constructIgnoreInternalRuleTypesFilter({ ruleTypes })!;

    expect(toKqlExpression(filter)).toMatchInlineSnapshot(
      `"NOT (alert.attributes.alertTypeId: internal-type OR alert.attributes.alertTypeId: internal-type-2)"`
    );
  });

  test('returns null if the ruleTypes map is empty', () => {
    expect(constructIgnoreInternalRuleTypesFilter({ ruleTypes: new Map() })).toBeNull();
  });
});

describe('combineFiltersWithInternalRuleTypeFilter', () => {
  const filterA = nodeBuilder.is('foo', 'bar');
  const filterB = nodeBuilder.is('baz', 'qux');

  test('returns null if both filters are null', () => {
    expect(
      combineFiltersWithInternalRuleTypeFilter({ filter: null, internalRuleTypeFilter: null })
    ).toBeNull();
  });

  test('returns internalRuleTypeFilter if filter is null', () => {
    expect(
      combineFiltersWithInternalRuleTypeFilter({ filter: null, internalRuleTypeFilter: filterA })
    ).toBe(filterA);
  });

  test('returns filter if internalRuleTypeFilter is null', () => {
    expect(
      combineFiltersWithInternalRuleTypeFilter({ filter: filterA, internalRuleTypeFilter: null })
    ).toBe(filterA);
  });

  test('returns AND node if both filters are present', () => {
    const result = combineFiltersWithInternalRuleTypeFilter({
      filter: filterA,
      internalRuleTypeFilter: filterB,
    })!;

    expect(toKqlExpression(result)).toMatchInlineSnapshot(`"(foo: bar AND baz: qux)"`);
  });
});
