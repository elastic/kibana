/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_OBSERVABLE_TYPES } from './default_observable_types';
import {
  getCustomObservableTypes,
  resolveObservableTypes,
  toBuiltinOverride,
  toStoredObservableTypes,
} from './resolve_observable_types';

const builtinOverride = {
  key: 'observable-type-agent-id',
  label: 'Agent id',
  paths: [{ path: 'agent.id', enabled: false }],
};
const customType = {
  key: 'employee-id',
  label: 'Employee ID',
  paths: [{ path: 'user.employee_id', enabled: true }],
};

describe('resolveObservableTypes', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [])).toEqual(DEFAULT_OBSERVABLE_TYPES);
  });

  it('turns off a default path', () => {
    const resolved = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
      { key: 'observable-type-agent-id', paths: [{ path: 'agent.id', enabled: false }] },
    ]);

    expect(resolved['observable-type-agent-id']).toEqual({
      key: 'observable-type-agent-id',
      label: 'Agent id',
      paths: [{ path: 'agent.id', enabled: false }],
    });
  });

  it('adds a path to a default type after its default paths, and keeps its pattern', () => {
    const resolved = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
      { key: 'observable-type-ipv4', paths: [{ path: 'zscaler.client_ip', enabled: true }] },
    ]);

    expect(resolved['observable-type-ipv4'].paths).toEqual([
      { path: 'source.ip', enabled: true },
      { path: 'destination.ip', enabled: true },
      { path: 'zscaler.client_ip', enabled: true },
    ]);
    expect(resolved['observable-type-ipv4'].valuePattern).toBe(
      DEFAULT_OBSERVABLE_TYPES['observable-type-ipv4'].valuePattern
    );
  });

  it('keeps the excluded values of a default path', () => {
    const resolved = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
      {
        key: 'observable-type-ipv4',
        paths: [{ path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] }],
      },
    ]);

    expect(resolved['observable-type-ipv4'].paths).toEqual([
      { path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] },
      { path: 'destination.ip', enabled: true },
    ]);
  });

  it('ignores a stored label or pattern on a default type', () => {
    const resolved = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
      { key: 'observable-type-hostname', label: 'Renamed', valuePattern: '.*' },
    ]);

    expect(resolved['observable-type-hostname']).toEqual(
      DEFAULT_OBSERVABLE_TYPES['observable-type-hostname']
    );
  });

  it('adds a custom type with its paths and pattern', () => {
    const resolved = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
      {
        key: 'employee-id',
        label: 'Employee ID',
        paths: [{ path: 'user.employee_id', enabled: true }],
        valuePattern: '^E\\d{6}$',
      },
    ]);

    expect(resolved['employee-id']).toEqual({
      key: 'employee-id',
      label: 'Employee ID',
      paths: [{ path: 'user.employee_id', enabled: true }],
      valuePattern: '^E\\d{6}$',
    });
  });

  it('adds a custom type without paths, which is manual only', () => {
    const resolved = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
      { key: 'ticket-ref', label: 'Ticket ref' },
    ]);

    expect(resolved['ticket-ref'].paths).toEqual([]);
  });
});

describe('toBuiltinOverride', () => {
  const ipv4 = DEFAULT_OBSERVABLE_TYPES['observable-type-ipv4'];

  it('returns no override when the paths match the defaults', () => {
    expect(toBuiltinOverride(ipv4, ipv4.paths)).toBeUndefined();
  });

  it('stores only a turned-off default path and the added paths', () => {
    expect(
      toBuiltinOverride(ipv4, [
        { path: 'source.ip', enabled: true },
        { path: 'destination.ip', enabled: false },
        { path: 'zscaler.client_ip', enabled: true },
      ])
    ).toEqual({
      key: 'observable-type-ipv4',
      paths: [
        { path: 'destination.ip', enabled: false },
        { path: 'zscaler.client_ip', enabled: true },
      ],
    });
  });

  it('stores a default path that has excluded values', () => {
    expect(
      toBuiltinOverride(ipv4, [
        { path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] },
        { path: 'destination.ip', enabled: true },
      ])
    ).toEqual({
      key: 'observable-type-ipv4',
      paths: [{ path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] }],
    });
  });

  it('returns no override when a default path has an empty list of excluded values', () => {
    expect(
      toBuiltinOverride(ipv4, [
        { path: 'source.ip', enabled: true, excludedValues: [] },
        { path: 'destination.ip', enabled: true },
      ])
    ).toBeUndefined();
  });
});

describe('getCustomObservableTypes', () => {
  it('removes the overrides of built-in types', () => {
    expect(getCustomObservableTypes([builtinOverride, customType])).toEqual([customType]);
  });
});

describe('toStoredObservableTypes', () => {
  it('removes the label from the overrides of built-in types only', () => {
    expect(toStoredObservableTypes([builtinOverride, customType])).toEqual([
      { key: 'observable-type-agent-id', paths: [{ path: 'agent.id', enabled: false }] },
      customType,
    ]);
  });
});
