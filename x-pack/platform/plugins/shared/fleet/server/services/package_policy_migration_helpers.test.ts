/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '../../common/types';

import { findInputForMigration } from './package_policy_migration_helpers';

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
