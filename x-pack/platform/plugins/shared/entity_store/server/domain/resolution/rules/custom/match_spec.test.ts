/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidCustomResolutionRuleError } from '../../../errors';
import {
  canonicalDefinitionKey,
  fingerprintDefinition,
  toExpressionMatchSpec,
  type CustomResolutionRuleDefinition,
} from './match_spec';

const LOCAL_USERS_TO_AD: CustomResolutionRuleDefinition = {
  namespaces: ['local', 'active_directory'],
  filter: 'NOT ENDS_WITH(user.name, "$")',
  match_value: 'TO_LOWER(user.name)',
  decline_same_namespace_duplicates: true,
};

describe('toExpressionMatchSpec', () => {
  it('parses both expressions', () => {
    expect(
      toExpressionMatchSpec({ ...LOCAL_USERS_TO_AD, match_value: 'TO_LOWER(user.name) // key' })
    ).toEqual({
      namespaces: ['local', 'active_directory'],
      filterExpression: 'NOT ENDS_WITH(user.name, "$")',
      matchValueExpression: 'TO_LOWER(user.name)',
      declineSameNamespaceDuplicates: true,
    });
  });

  it('passes the same-namespace opt-out through', () => {
    expect(
      toExpressionMatchSpec({ ...LOCAL_USERS_TO_AD, decline_same_namespace_duplicates: false })
    ).toMatchObject({ declineSameNamespaceDuplicates: false });
  });

  it('leaves the filter out when the rule has none', () => {
    const { filter, ...withoutFilter } = LOCAL_USERS_TO_AD;
    expect(toExpressionMatchSpec(withoutFilter)).not.toHaveProperty('filterExpression');
  });

  it('accepts namespaces with uppercase letters, dots and hyphens', () => {
    expect(
      toExpressionMatchSpec({ ...LOCAL_USERS_TO_AD, namespaces: ['HR-Sync', 'okta.system'] })
    ).toMatchObject({ namespaces: ['HR-Sync', 'okta.system'] });
  });

  it.each([
    ['no namespaces', { namespaces: [] }],
    ['a space in a namespace', { namespaces: ['Active Directory'] }],
    ['a quote in a namespace', { namespaces: ['local", "okta'] }],
    ['a repeated namespace', { namespaces: ['local', 'local'] }],
    ['an invalid filter', { filter: 'user.name | LIMIT 1' }],
    ['an invalid match value', { match_value: 'a = 1' }],
  ])('rejects %s', (_case, override) => {
    expect(() => toExpressionMatchSpec({ ...LOCAL_USERS_TO_AD, ...override })).toThrow(
      InvalidCustomResolutionRuleError
    );
  });
});

describe('fingerprintDefinition', () => {
  it('ignores namespace order and surrounding whitespace', () => {
    expect(
      fingerprintDefinition({
        ...LOCAL_USERS_TO_AD,
        namespaces: ['active_directory', 'local'],
        match_value: '  TO_LOWER(user.name)\n',
      })
    ).toBe(fingerprintDefinition(LOCAL_USERS_TO_AD));
  });

  it('keeps the positional format stored fingerprints were computed from', () => {
    expect(canonicalDefinitionKey(LOCAL_USERS_TO_AD)).toBe(
      JSON.stringify([
        ['active_directory', 'local'],
        'NOT ENDS_WITH(user.name, "$")',
        'TO_LOWER(user.name)',
        true,
      ])
    );
  });

  it('is built from the stored source, so a printer upgrade cannot change it', () => {
    expect(canonicalDefinitionKey(LOCAL_USERS_TO_AD)).toContain(
      'NOT ENDS_WITH(user.name, \\"$\\")'
    );
  });

  it.each([
    ['namespaces', { namespaces: ['local'] }],
    ['filter', { filter: 'user.name IS NOT NULL' }],
    ['match value', { match_value: 'TO_UPPER(user.name)' }],
    ['same-namespace check', { decline_same_namespace_duplicates: false }],
  ])('changes when the %s change', (_case, override) => {
    expect(fingerprintDefinition({ ...LOCAL_USERS_TO_AD, ...override })).not.toBe(
      fingerprintDefinition(LOCAL_USERS_TO_AD)
    );
  });

  it('changes when the filter is removed', () => {
    const { filter, ...withoutFilter } = LOCAL_USERS_TO_AD;
    expect(fingerprintDefinition(withoutFilter)).not.toBe(fingerprintDefinition(LOCAL_USERS_TO_AD));
  });
});
