/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_OBSERVABLE_TYPES } from './default_observable_types';
import { resolveObservableTypes } from './resolve_observable_types';

describe('resolveObservableTypes', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [], [])).toEqual(
      DEFAULT_OBSERVABLE_TYPES
    );
  });

  it('turns off a default path', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [],
      [{ key: 'observable-type-agent-id', paths: [{ path: 'agent.id', enabled: false }] }]
    );

    expect(resolved['observable-type-agent-id']).toEqual({
      key: 'observable-type-agent-id',
      label: 'Agent id',
      paths: [{ path: 'agent.id', enabled: false }],
    });
  });

  it('adds a path to a default type after its default paths, and keeps its pattern', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [],
      [{ key: 'observable-type-ipv4', paths: [{ path: 'zscaler.client_ip', enabled: true }] }]
    );

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
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [],
      [
        {
          key: 'observable-type-ipv4',
          paths: [{ path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] }],
        },
      ]
    );

    expect(resolved['observable-type-ipv4'].paths).toEqual([
      { path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] },
      { path: 'destination.ip', enabled: true },
    ]);
  });

  it('ignores a value pattern in the settings of a default type', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [],
      [{ key: 'observable-type-hostname', valuePattern: '.*' }]
    );

    expect(resolved['observable-type-hostname']).toEqual(
      DEFAULT_OBSERVABLE_TYPES['observable-type-hostname']
    );
  });

  it('ignores a custom type with the key of a default type', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [{ key: 'observable-type-hostname', label: 'Renamed' }],
      []
    );

    expect(resolved['observable-type-hostname']).toEqual(
      DEFAULT_OBSERVABLE_TYPES['observable-type-hostname']
    );
  });

  it('adds a custom type with the paths and the pattern of its settings', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [{ key: 'employee-id', label: 'Employee ID' }],
      [
        {
          key: 'employee-id',
          paths: [{ path: 'user.employee_id', enabled: true }],
          valuePattern: '^E\\d{6}$',
        },
      ]
    );

    expect(resolved['employee-id']).toEqual({
      key: 'employee-id',
      label: 'Employee ID',
      paths: [{ path: 'user.employee_id', enabled: true }],
      valuePattern: '^E\\d{6}$',
    });
  });

  it('adds a custom type without settings, which is manual only', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [{ key: 'ticket-ref', label: 'Ticket ref' }],
      []
    );

    expect(resolved['ticket-ref']).toEqual({ key: 'ticket-ref', label: 'Ticket ref', paths: [] });
  });

  it('ignores settings without a built-in or custom type', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [],
      [{ key: 'deleted-type', paths: [{ path: 'user.name', enabled: true }] }]
    );

    expect(Object.hasOwn(resolved, 'deleted-type')).toBe(false);
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'treats the custom key "%s" as a custom type',
    (key) => {
      const resolved = resolveObservableTypes(
        DEFAULT_OBSERVABLE_TYPES,
        [{ key, label: 'Custom' }],
        [
          { key, paths: [{ path: 'custom.field', enabled: true }] },
          { key: 'observable-type-agent-id', paths: [{ path: 'agent.id', enabled: false }] },
        ]
      );

      expect(Object.getOwnPropertyDescriptor(resolved, key)?.value).toEqual({
        key,
        label: 'Custom',
        paths: [{ path: 'custom.field', enabled: true }],
        valuePattern: undefined,
      });
      expect(resolved['observable-type-agent-id'].paths).toEqual([
        { path: 'agent.id', enabled: false },
      ]);
    }
  );

  it('ignores the settings of an inherited key without a custom type', () => {
    const resolved = resolveObservableTypes(
      DEFAULT_OBSERVABLE_TYPES,
      [],
      [{ key: 'constructor', paths: [{ path: 'custom.field', enabled: true }] }]
    );

    expect(Object.hasOwn(resolved, 'constructor')).toBe(false);
  });
});
