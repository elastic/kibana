/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldBinding } from '../../common/step_types/provision_connector_from_secret';
import type { FieldClassification } from './field_classification';
import {
  collectUniquePaths,
  mergeFieldSources,
  resolveFieldSources,
  validateExplicitOverrideTargetFields,
  type FieldSource,
} from './field_source_resolution';

const CONFIG_FIELD_NAMES = ['region'];
const SECRET_FIELD_NAMES = ['clientId', 'clientSecret', 'tokenUrl'];
const SECRET_FIELD_NAME_SET = new Set(SECRET_FIELD_NAMES);
const CLASSIFICATION: FieldClassification = {
  configFieldNames: CONFIG_FIELD_NAMES,
  secretFieldNames: SECRET_FIELD_NAMES,
  allFieldNames: new Set([...CONFIG_FIELD_NAMES, ...SECRET_FIELD_NAMES]),
};

describe('validateExplicitOverrideTargetFields', () => {
  it('passes when every explicit override targetField is a recognized secrets field', () => {
    const bindings: FieldBinding[] = [
      { path: 'secret/data/a', field: 'secretValue', targetField: 'clientSecret' },
    ];
    expect(() =>
      validateExplicitOverrideTargetFields(bindings, CLASSIFICATION, '.fake_connector')
    ).not.toThrow();
  });

  it('ignores path-only bindings (nothing to validate pre-Vault-call)', () => {
    const bindings: FieldBinding[] = [{ path: 'secret/data/a' }];
    expect(() =>
      validateExplicitOverrideTargetFields(bindings, CLASSIFICATION, '.fake_connector')
    ).not.toThrow();
  });

  it('fails fast, before any Vault call, on an unrecognized explicit override targetField', () => {
    const bindings: FieldBinding[] = [
      { path: 'secret/data/a', field: 'x', targetField: 'notARealField' },
    ];
    expect(() =>
      validateExplicitOverrideTargetFields(bindings, CLASSIFICATION, '.fake_connector')
    ).toThrow(/does not match any config or secrets field/);
  });

  it('rejects an explicit override that targets a cleartext config field', () => {
    const bindings: FieldBinding[] = [{ path: 'secret/data/a', field: 'x', targetField: 'region' }];
    expect(() =>
      validateExplicitOverrideTargetFields(bindings, CLASSIFICATION, '.fake_connector')
    ).toThrow(/stored in cleartext.*may only populate secrets/s);
  });
});

describe('collectUniquePaths', () => {
  it('dedupes repeated paths across bindings', () => {
    const bindings: FieldBinding[] = [
      { path: 'secret/data/a' },
      { path: 'secret/data/a', field: 'x', targetField: 'clientSecret' },
      { path: 'secret/data/b' },
    ];
    expect(collectUniquePaths(bindings)).toEqual(['secret/data/a', 'secret/data/b']);
  });
});

describe('resolveFieldSources', () => {
  const resolve = (params: Partial<Parameters<typeof resolveFieldSources>[0]> = {}) =>
    resolveFieldSources({
      targetConnectorConfig: undefined,
      targetConnectorSecrets: undefined,
      fieldBindings: [],
      valuesByPath: new Map(),
      secretFieldNames: SECRET_FIELD_NAME_SET,
      ...params,
    });

  it('resolves a single literal config source', () => {
    const result = resolve({ targetConnectorConfig: { region: 'eu-west-1' } });
    expect(result.get('region')).toEqual({ kind: 'config-literal' });
  });

  it('resolves a single literal secrets source', () => {
    const result = resolve({ targetConnectorSecrets: { tokenUrl: 'https://example.com' } });
    expect(result.get('tokenUrl')).toEqual({ kind: 'secrets-literal' });
  });

  it('auto-matches path-only bindings against known field names, ignoring extras', () => {
    const result = resolve({
      fieldBindings: [{ path: 'secret/data/a' }],
      valuesByPath: new Map([
        ['secret/data/a', { clientId: 'abc', clientSecret: 'xyz', unrelatedKey: 'ignored' }],
      ]),
    });
    expect(result.get('clientId')).toEqual({ kind: 'auto-match', path: 'secret/data/a' });
    expect(result.get('clientSecret')).toEqual({ kind: 'auto-match', path: 'secret/data/a' });
    expect(result.has('unrelatedKey')).toBe(false);
  });

  it('resolves an explicit override to the specific path/field pair', () => {
    const result = resolve({
      fieldBindings: [{ path: 'secret/data/a', field: 'secretValue', targetField: 'clientSecret' }],
      valuesByPath: new Map([['secret/data/a', { secretValue: 'xyz' }]]),
    });
    expect(result.get('clientSecret')).toEqual({
      kind: 'override',
      path: 'secret/data/a',
      field: 'secretValue',
    });
  });

  it('fails fast when a path-only binding matches zero secrets field names', () => {
    expect(() =>
      resolve({
        fieldBindings: [{ path: 'secret/data/a' }],
        valuesByPath: new Map([['secret/data/a', { unrelatedKey: 'value' }]]),
      })
    ).toThrow(/No fields at Vault path 'secret\/data\/a' match any secrets field/);
  });

  it('ignores a Vault field whose name matches a config field (never routes it to cleartext config)', () => {
    // `region` is a config field, so a Vault key named `region` is not auto-matched; the
    // `clientSecret` secret field is what makes the binding non-empty.
    const result = resolve({
      fieldBindings: [{ path: 'secret/data/a' }],
      valuesByPath: new Map([['secret/data/a', { region: 'us-east-1', clientSecret: 'xyz' }]]),
    });
    expect(result.has('region')).toBe(false);
    expect(result.get('clientSecret')).toEqual({ kind: 'auto-match', path: 'secret/data/a' });
  });

  it('lets an explicit override win over an auto-match from the identical path (sole exception)', () => {
    const result = resolve({
      fieldBindings: [
        { path: 'secret/data/a' },
        { path: 'secret/data/a', field: 'secretAlt', targetField: 'clientSecret' },
      ],
      valuesByPath: new Map([
        [
          'secret/data/a',
          { clientId: 'abc', clientSecret: 'auto-match-value', secretAlt: 'override-value' },
        ],
      ]),
    });
    expect(result.get('clientSecret')).toEqual({
      kind: 'override',
      path: 'secret/data/a',
      field: 'secretAlt',
    });
    expect(result.get('clientId')).toEqual({ kind: 'auto-match', path: 'secret/data/a' });
  });

  it('fails fast when two different paths auto-match the same targetField, naming both sources', () => {
    expect(() =>
      resolve({
        fieldBindings: [{ path: 'secret/data/a' }, { path: 'secret/data/b' }],
        valuesByPath: new Map([
          ['secret/data/a', { clientSecret: 'from-a' }],
          ['secret/data/b', { clientSecret: 'from-b' }],
        ]),
      })
    ).toThrow(/conflicting sources.*secret\/data\/a.*secret\/data\/b/s);
  });

  it('fails fast when a Vault auto-match binding collides with targetConnectorSecrets', () => {
    expect(() =>
      resolve({
        targetConnectorSecrets: { tokenUrl: 'https://a.example' },
        fieldBindings: [{ path: 'secret/data/a' }],
        valuesByPath: new Map([['secret/data/a', { tokenUrl: 'https://b.example' }]]),
      })
    ).toThrow(/targetField 'tokenUrl' has conflicting sources/);
  });

  it('fails fast when two explicit overrides target the same field', () => {
    expect(() =>
      resolve({
        fieldBindings: [
          { path: 'secret/data/a', field: 'x', targetField: 'clientSecret' },
          { path: 'secret/data/b', field: 'y', targetField: 'clientSecret' },
        ],
        valuesByPath: new Map<string, Record<string, string>>([
          ['secret/data/a', { x: '1' }],
          ['secret/data/b', { y: '2' }],
        ]),
      })
    ).toThrow(/targetField 'clientSecret' has conflicting sources/);
  });

  it('fails fast when the same key is present in both targetConnectorConfig and targetConnectorSecrets', () => {
    expect(() =>
      resolve({
        targetConnectorConfig: { region: 'eu-west-1' },
        targetConnectorSecrets: { region: 'us-east-1' },
      })
    ).toThrow(
      /targetField 'region' has conflicting sources: targetConnectorConfig, targetConnectorSecrets/
    );
  });
});

describe('mergeFieldSources', () => {
  it('buckets resolved fields into config vs secrets by the target spec classification', () => {
    const resolvedSourceByTargetField = new Map<string, FieldSource>([
      ['region', { kind: 'config-literal' }],
      ['clientSecret', { kind: 'auto-match', path: 'secret/data/a' }],
    ]);

    const { config, secrets } = mergeFieldSources({
      resolvedSourceByTargetField,
      configFieldNames: CONFIG_FIELD_NAMES,
      targetConnectorConfig: { region: 'eu-west-1' },
      targetConnectorSecrets: undefined,
      valuesByPath: new Map([['secret/data/a', { clientSecret: 'xyz' }]]),
    });

    expect(config).toEqual({ region: 'eu-west-1' });
    expect(secrets).toEqual({ clientSecret: 'xyz' });
  });

  it('extracts the override field value, not the targetField name, from the fetched path values', () => {
    const resolvedSourceByTargetField = new Map<string, FieldSource>([
      ['clientSecret', { kind: 'override', path: 'secret/data/a', field: 'secretValue' }],
    ]);

    const { secrets } = mergeFieldSources({
      resolvedSourceByTargetField,
      configFieldNames: CONFIG_FIELD_NAMES,
      targetConnectorConfig: undefined,
      targetConnectorSecrets: undefined,
      valuesByPath: new Map([['secret/data/a', { secretValue: 'xyz' }]]),
    });

    expect(secrets).toEqual({ clientSecret: 'xyz' });
  });

  it('refuses (defense in depth) to write a Vault-sourced value into a config field', () => {
    const resolvedSourceByTargetField = new Map<string, FieldSource>([
      ['region', { kind: 'auto-match', path: 'secret/data/a' }],
    ]);

    expect(() =>
      mergeFieldSources({
        resolvedSourceByTargetField,
        configFieldNames: CONFIG_FIELD_NAMES,
        targetConnectorConfig: undefined,
        targetConnectorSecrets: undefined,
        valuesByPath: new Map([['secret/data/a', { region: 'us-east-1' }]]),
      })
    ).toThrow(/refusing to write a Vault-sourced value into cleartext config field 'region'/);
  });
});
