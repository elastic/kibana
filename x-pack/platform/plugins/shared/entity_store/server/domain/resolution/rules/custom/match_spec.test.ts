/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidCustomResolutionRuleError } from '../../../errors';
import {
  fingerprintMatchSpec,
  toExpressionMatchSpec,
  type CustomResolutionRuleDefinition,
} from './match_spec';

const ELEVANCE: CustomResolutionRuleDefinition = {
  namespaces: ['local', 'active_directory'],
  filter: 'NOT ENDS_WITH(user.name, "$")',
  matchValue: 'TO_LOWER(user.name)',
  declineSameNamespaceDuplicates: true,
};

describe('toExpressionMatchSpec', () => {
  it('normalizes both expressions', () => {
    expect(
      toExpressionMatchSpec({ ...ELEVANCE, matchValue: 'TO_LOWER(user.name) // key' })
    ).toEqual({
      namespaces: ['local', 'active_directory'],
      filterExpression: 'NOT ENDS_WITH(user.name, "$")',
      matchValueExpression: 'TO_LOWER(user.name)',
      declineSameNamespaceDuplicates: true,
    });
  });

  it('leaves the filter out when the rule has none', () => {
    const { filter, ...withoutFilter } = ELEVANCE;
    expect(toExpressionMatchSpec(withoutFilter)).not.toHaveProperty('filterExpression');
  });

  it.each([
    ['no namespaces', { namespaces: [] }],
    ['an uppercase namespace', { namespaces: ['Active_Directory'] }],
    ['a quote in a namespace', { namespaces: ['local", "okta'] }],
    ['a repeated namespace', { namespaces: ['local', 'local'] }],
    ['an invalid filter', { filter: 'user.name | LIMIT 1' }],
    ['an invalid match value', { matchValue: 'a = 1' }],
  ])('rejects %s', (_case, override) => {
    expect(() => toExpressionMatchSpec({ ...ELEVANCE, ...override })).toThrow(
      InvalidCustomResolutionRuleError
    );
  });
});

describe('fingerprintMatchSpec', () => {
  const fingerprint = (definition: CustomResolutionRuleDefinition) =>
    fingerprintMatchSpec(toExpressionMatchSpec(definition));

  it('ignores namespace order and formatting differences', () => {
    expect(
      fingerprint({
        ...ELEVANCE,
        namespaces: ['active_directory', 'local'],
        matchValue: 'TO_LOWER(  user.name ) /* same */',
      })
    ).toBe(fingerprint(ELEVANCE));
  });

  it.each([
    ['namespaces', { namespaces: ['local'] }],
    ['filter', { filter: 'user.name IS NOT NULL' }],
    ['match value', { matchValue: 'TO_UPPER(user.name)' }],
    ['same-namespace check', { declineSameNamespaceDuplicates: false }],
  ])('changes when the %s change', (_case, override) => {
    expect(fingerprint({ ...ELEVANCE, ...override })).not.toBe(fingerprint(ELEVANCE));
  });

  it('changes when the filter is removed', () => {
    const { filter, ...withoutFilter } = ELEVANCE;
    expect(fingerprint(withoutFilter)).not.toBe(fingerprint(ELEVANCE));
  });
});
