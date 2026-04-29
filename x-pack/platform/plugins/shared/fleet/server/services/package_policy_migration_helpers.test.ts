/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  InputsOverride,
} from '../../common/types';

import {
  findInputForMigration,
  buildVarRenameMap,
  migrateStreamVars,
  applyInputLevelMigration,
} from './package_policy_migration_helpers';

describe('findInputForMigration', () => {
  const makeInput = (
    overrides: Partial<NewPackagePolicyInput> & { type: string }
  ): NewPackagePolicyInput => ({
    enabled: true,
    streams: [],
    ...overrides,
  });

  it('finds input by type when no name is set', () => {
    const inputs = [
      makeInput({ type: 'logfile', policy_template: 'nginx' }),
      makeInput({ type: 'httpjson', policy_template: 'nginx' }),
    ];

    const result = findInputForMigration(inputs, 'httpjson', 'nginx');
    expect(result?.type).toBe('httpjson');
  });

  it('finds input by name when searching by id value', () => {
    const inputs = [
      makeInput({
        type: 'otelcol',
        name: 'filelog_otel',
        policy_template: 'nginx',
      }),
      makeInput({
        type: 'otelcol',
        name: 'nginx_otel',
        policy_template: 'nginx',
      }),
    ];

    const result = findInputForMigration(inputs, 'filelog_otel', 'nginx');
    expect(result?.name).toBe('filelog_otel');
  });

  it('does not match the wrong input when multiple inputs share the same type', () => {
    const inputs = [
      makeInput({
        type: 'otelcol',
        name: 'filelog_otel',
        policy_template: 'nginx',
      }),
      makeInput({
        type: 'otelcol',
        name: 'nginx_otel',
        policy_template: 'nginx',
      }),
    ];

    const result = findInputForMigration(inputs, 'nginx_otel', 'nginx');
    expect(result?.name).toBe('nginx_otel');
  });

  it('does not match by type when inputs have explicit names', () => {
    const inputs = [
      makeInput({
        type: 'otelcol',
        name: 'filelog_otel',
        policy_template: 'nginx',
      }),
      makeInput({
        type: 'otelcol',
        name: 'nginx_otel',
        policy_template: 'nginx',
      }),
    ];

    // Searching by type 'otelcol' is ambiguous when both inputs
    // have explicit names -- should not match either
    const result = findInputForMigration(inputs, 'otelcol', 'nginx');
    expect(result).toBeUndefined();
  });
});

describe('buildVarRenameMap', () => {
  it('returns an empty object when no vars have migrate_from', () => {
    const result = buildVarRenameMap([
      { name: 'url', type: 'text' },
      { name: 'interval', type: 'text' },
    ]);
    expect(result).toEqual({});
  });

  it('maps new var name to old var name for vars with migrate_from', () => {
    const result = buildVarRenameMap([{ name: 'url', type: 'text', migrate_from: 'request_url' }]);
    expect(result).toEqual({ url: 'request_url' });
  });

  it('handles multiple vars with migrate_from', () => {
    const result = buildVarRenameMap([
      { name: 'url', type: 'text', migrate_from: 'request_url' },
      { name: 'token', type: 'password', migrate_from: 'api_token' },
      { name: 'interval', type: 'text' },
    ]);
    expect(result).toEqual({ url: 'request_url', token: 'api_token' });
  });
});

describe('migrateStreamVars', () => {
  const makeStream = (
    vars: Record<string, { type?: string; value: unknown }>
  ): NewPackagePolicyInputStream => ({
    enabled: true,
    data_stream: { dataset: 'test.dataset', type: 'logs' },
    vars,
  });

  it('carries a renamed var value from the old stream to the new stream', () => {
    const newStream = makeStream({ url: { type: 'text', value: 'https://default.example.com' } });
    const oldStream = makeStream({
      request_url: { type: 'text', value: 'https://user.example.com' },
    });
    const varDefs = [{ name: 'url', type: 'text' as const, migrate_from: 'request_url' }];

    const result = migrateStreamVars(
      newStream as unknown as InputsOverride,
      oldStream,
      undefined,
      varDefs
    );

    expect(result.vars?.url?.value).toBe('https://user.example.com');
  });

  it('falls through to the new package default when the old renamed var has a null value', () => {
    const newStream = makeStream({ url: { type: 'text', value: 'https://default.example.com' } });
    const oldStream = makeStream({ request_url: { type: 'text', value: null } });
    const varDefs = [{ name: 'url', type: 'text' as const, migrate_from: 'request_url' }];

    const result = migrateStreamVars(
      newStream as unknown as InputsOverride,
      oldStream,
      undefined,
      varDefs
    );

    expect(result.vars?.url?.value).toBe('https://default.example.com');
  });

  it('uses the new package default when the old renamed var is absent from the old stream', () => {
    const newStream = makeStream({ url: { type: 'text', value: 'https://default.example.com' } });
    const oldStream = makeStream({});
    const varDefs = [{ name: 'url', type: 'text' as const, migrate_from: 'request_url' }];

    const result = migrateStreamVars(
      newStream as unknown as InputsOverride,
      oldStream,
      undefined,
      varDefs
    );

    expect(result.vars?.url?.value).toBe('https://default.example.com');
  });

  it('does not overwrite a new-name var already present in old vars with the renamed value', () => {
    // Old stream has both the old name and new name — the direct new-name value takes priority.
    const newStream = makeStream({ url: { type: 'text', value: 'https://default.example.com' } });
    const oldStream = makeStream({
      url: { type: 'text', value: 'https://direct.example.com' },
      request_url: { type: 'text', value: 'https://renamed.example.com' },
    });
    const varDefs = [{ name: 'url', type: 'text' as const, migrate_from: 'request_url' }];

    const result = migrateStreamVars(
      newStream as unknown as InputsOverride,
      oldStream,
      undefined,
      varDefs
    );

    expect(result.vars?.url?.value).toBe('https://direct.example.com');
  });

  it('strips the old var name from the result (it is not in the new schema)', () => {
    const newStream = makeStream({ url: { type: 'text', value: 'https://default.example.com' } });
    const oldStream = makeStream({
      request_url: { type: 'text', value: 'https://user.example.com' },
    });
    const varDefs = [{ name: 'url', type: 'text' as const, migrate_from: 'request_url' }];

    const result = migrateStreamVars(
      newStream as unknown as InputsOverride,
      oldStream,
      undefined,
      varDefs
    );

    expect(result.vars).not.toHaveProperty('request_url');
  });

  it('carries renamed var from old input-level vars when not present in old stream vars', () => {
    const newStream = makeStream({ url: { type: 'text', value: 'https://default.example.com' } });
    const oldStream = makeStream({});
    const oldInputVars = {
      request_url: { type: 'text', value: 'https://input-level.example.com' },
    };
    const varDefs = [{ name: 'url', type: 'text' as const, migrate_from: 'request_url' }];

    const result = migrateStreamVars(
      newStream as unknown as InputsOverride,
      oldStream,
      oldInputVars,
      varDefs
    );

    expect(result.vars?.url?.value).toBe('https://input-level.example.com');
  });
});

describe('applyInputLevelMigration', () => {
  const makeInput = (
    overrides: Partial<NewPackagePolicyInput> & { type: string }
  ): NewPackagePolicyInput => ({
    enabled: true,
    streams: [],
    ...overrides,
  });

  it('carries a renamed input var to the new name when varDefs declares migrate_from', () => {
    const update = makeInput({
      type: 'cel',
      migrate_from: 'httpjson',
      vars: { azure_tenant_id: { type: 'text', value: 'new-default' } },
    }) as unknown as InputsOverride;
    const oldInput = makeInput({
      type: 'httpjson',
      vars: { tenant_id: { type: 'text', value: 'my-tenant' } },
    });
    const varDefs = [{ name: 'azure_tenant_id', type: 'text' as const, migrate_from: 'tenant_id' }];

    applyInputLevelMigration(update, [oldInput], [oldInput], varDefs);

    expect(update.vars?.azure_tenant_id?.value).toBe('my-tenant');
  });

  it('falls through to the new package default when the old renamed input var has a null value', () => {
    const update = makeInput({
      type: 'cel',
      migrate_from: 'httpjson',
      vars: { azure_tenant_id: { type: 'text', value: 'new-default' } },
    }) as unknown as InputsOverride;
    const oldInput = makeInput({
      type: 'httpjson',
      vars: { tenant_id: { type: 'text', value: null } },
    });
    const varDefs = [{ name: 'azure_tenant_id', type: 'text' as const, migrate_from: 'tenant_id' }];

    applyInputLevelMigration(update, [oldInput], [oldInput], varDefs);

    expect(update.vars?.azure_tenant_id?.value).toBe('new-default');
  });

  it('does not overwrite when the new name is already present in old input vars', () => {
    const update = makeInput({
      type: 'cel',
      migrate_from: 'httpjson',
      vars: { azure_tenant_id: { type: 'text', value: 'new-default' } },
    }) as unknown as InputsOverride;
    const oldInput = makeInput({
      type: 'httpjson',
      vars: {
        azure_tenant_id: { type: 'text', value: 'direct-value' },
        tenant_id: { type: 'text', value: 'renamed-value' },
      },
    });
    const varDefs = [{ name: 'azure_tenant_id', type: 'text' as const, migrate_from: 'tenant_id' }];

    applyInputLevelMigration(update, [oldInput], [oldInput], varDefs);

    // Direct mapping wins over the rename
    expect(update.vars?.azure_tenant_id?.value).toBe('direct-value');
  });
});
