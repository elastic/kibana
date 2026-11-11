/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ObservablePost } from '../types/api';
import { DEFAULT_OBSERVABLE_TYPES } from './default_observable_types';
import {
  getIPType,
  getObservablesFromEcs,
  MAX_VALUE_LENGTH_FOR_PATTERN,
  processObservable,
} from './get_observables_from_ecs';
import { resolveObservableTypes } from './resolve_observable_types';

describe('getIPType', () => {
  it('should return IPV4 for a valid IPv4 address', () => {
    expect(getIPType('192.168.1.1')).toBe('IPV4');
  });
  it('should return IPV6 for a valid IPv6 address', () => {
    expect(getIPType('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('IPV6');
  });
  it('should return IPV6 for a valid IPv6 address with a port', () => {
    expect(getIPType('2001:0db8:85a3:0000:0000:8a2e:0370:7334:80')).toBe('IPV6');
  });
});

describe('processObservable', () => {
  it('should add an observable to the map', () => {
    const observablesMap = new Map<string, ObservablePost>();
    processObservable(observablesMap, 'value', 'key', 'Description');
    expect(observablesMap.get('key-value')).toEqual({
      typeKey: 'key',
      value: 'value',
      description: 'Description',
    });
  });

  it('should allow different type keys with the same value', () => {
    const observablesMap = new Map<string, ObservablePost>();
    processObservable(observablesMap, 'value', 'key1', 'Description');
    processObservable(observablesMap, 'value', 'key2', 'Description');
    expect(Array.from(observablesMap.values())).toEqual([
      {
        typeKey: 'key1',
        value: 'value',
        description: 'Description',
      },
      {
        typeKey: 'key2',
        value: 'value',
        description: 'Description',
      },
    ]);
  });

  it('should preserve the initial value if a duplicate is added with a different description', () => {
    const observablesMap = new Map<string, ObservablePost>();
    processObservable(observablesMap, 'value', 'key', 'Description');
    processObservable(observablesMap, 'value', 'key', 'Another Description');
    expect(observablesMap.get('key-value')).toEqual({
      typeKey: 'key',
      value: 'value',
      description: 'Description',
    });
  });
});

describe('getObservablesFromEcsDataArray', () => {
  it('should return an array of observables for a valid Ecs data', () => {
    expect(
      getObservablesFromEcs([
        [
          { field: 'source.ip', value: ['192.168.1.1'] },
          { field: 'destination.ip', value: ['023:023:023:023:023:023:023:023'] },
          { field: 'host.name', value: ['host1'] },
          { field: 'file.hash.sha256', value: ['sha256hash', 'sha256hash2'] },
          { field: 'dns.question.name', value: ['example.com', 'example.org'] },
          { field: 'agent.id', value: ['agent1', 'agent2'] },
        ],
      ])
    ).toEqual([
      {
        typeKey: 'observable-type-ipv4',
        value: '192.168.1.1',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-ipv6',
        value: '023:023:023:023:023:023:023:023',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-hostname',
        value: 'host1',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-file-hash',
        value: 'sha256hash',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-file-hash',
        value: 'sha256hash2',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-domain',
        value: 'example.com',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-domain',
        value: 'example.org',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-agent-id',
        value: 'agent1',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-agent-id',
        value: 'agent2',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should return unique observables', () => {
    expect(
      getObservablesFromEcs([
        [
          { field: 'file.hash.sha512', value: ['sha'] },
          { field: 'file.hash.sha256', value: ['sha'] },
        ],
      ])
    ).toEqual([
      {
        typeKey: 'observable-type-file-hash',
        value: 'sha',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should not include observables with no value', () => {
    expect(
      getObservablesFromEcs([
        [{ field: 'host.name' }, { field: 'file.hash.sha512', value: ['sha'] }],
      ])
    ).toEqual([
      {
        typeKey: 'observable-type-file-hash',
        value: 'sha',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should return observables with different key value pairs', () => {
    expect(
      getObservablesFromEcs([
        [
          { field: 'host.name', value: ['name'] },
          { field: 'file.path', value: ['name'] },
        ],
      ])
    ).toEqual([
      {
        typeKey: 'observable-type-hostname',
        value: 'name',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-file-path',
        value: 'name',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should return correct observables from multiple ecs data arrays', () => {
    expect(
      getObservablesFromEcs([
        [
          { field: 'host.name', value: ['host1'] },
          { field: 'file.path', value: ['path1'] },
        ],
        [
          { field: 'host.name', value: ['host2'] },
          { field: 'file.path', value: ['path2'] },
        ],
      ])
    ).toEqual([
      {
        typeKey: 'observable-type-hostname',
        value: 'host1',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-file-path',
        value: 'path1',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-hostname',
        value: 'host2',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-file-path',
        value: 'path2',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should split IPv4 and IPv6 values of one path into their own types, in value order', () => {
    expect(
      getObservablesFromEcs([
        [
          { field: 'source.ip', value: ['2001:db8::1', '10.0.0.1'] },
          { field: 'destination.ip', value: ['10.0.0.2'] },
        ],
      ])
    ).toEqual([
      {
        typeKey: 'observable-type-ipv6',
        value: '2001:db8::1',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-ipv4',
        value: '10.0.0.1',
        description: 'Auto extracted observable',
      },
      {
        typeKey: 'observable-type-ipv4',
        value: '10.0.0.2',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should skip empty values on every path', () => {
    expect(
      getObservablesFromEcs([
        [
          { field: 'host.name', value: [''] },
          { field: 'file.path', value: ['', 'path1'] },
          { field: 'agent.id', value: [''] },
        ],
      ])
    ).toEqual([
      {
        typeKey: 'observable-type-file-path',
        value: 'path1',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should ignore fields that no default type reads', () => {
    expect(getObservablesFromEcs([[{ field: 'user.name', value: ['alice'] }]])).toEqual([]);
  });

  describe('with the stored observable types', () => {
    const description = 'Auto extracted observable';

    it('skips a field that is turned off, and reads a custom type with its pattern', () => {
      const observableTypes = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
        { key: 'observable-type-agent-id', paths: [{ path: 'agent.id', enabled: false }] },
        {
          key: 'employee-id',
          label: 'Employee ID',
          paths: [{ path: 'user.employee_id', enabled: true }],
          valuePattern: '^E\\d{6}$',
        },
      ]);

      expect(
        getObservablesFromEcs(
          [
            [
              { field: 'agent.id', value: ['agent1'] },
              { field: 'user.employee_id', value: ['E123456', 'not-an-id'] },
              { field: 'host.name', value: ['host1'] },
            ],
          ],
          observableTypes
        )
      ).toEqual([
        { typeKey: 'employee-id', value: 'E123456', description },
        { typeKey: 'observable-type-hostname', value: 'host1', description },
      ]);
    });

    it('skips an excluded value only on the field that excludes it', () => {
      const observableTypes = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
        {
          key: 'observable-type-ipv4',
          paths: [{ path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] }],
        },
      ]);

      expect(
        getObservablesFromEcs(
          [
            [
              { field: 'source.ip', value: ['127.0.0.1', '10.0.0.1'] },
              { field: 'destination.ip', value: ['127.0.0.1'] },
            ],
          ],
          observableTypes
        )
      ).toEqual([
        { typeKey: 'observable-type-ipv4', value: '10.0.0.1', description },
        { typeKey: 'observable-type-ipv4', value: '127.0.0.1', description },
      ]);
    });

    it('compares excluded values exactly and with case', () => {
      const observableTypes = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
        {
          key: 'observable-type-hostname',
          paths: [{ path: 'host.name', enabled: true, excludedValues: ['localhost'] }],
        },
      ]);

      expect(
        getObservablesFromEcs(
          [[{ field: 'host.name', value: ['localhost', 'LocalHost', 'localhost.lan'] }]],
          observableTypes
        ).map(({ value }) => value)
      ).toEqual(['LocalHost', 'localhost.lan']);
    });

    it('does not extract an IPv6 value on an IPv4 type', () => {
      expect(
        getObservablesFromEcs([[{ field: 'source.ip', value: ['2001:db8::1'] }]]).map(
          ({ typeKey }) => typeKey
        )
      ).toEqual(['observable-type-ipv6']);
    });

    it('skips a value that is longer than the bound of the pattern', () => {
      const observableTypes = resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, [
        {
          key: 'any-id',
          label: 'Any id',
          paths: [{ path: 'user.id', enabled: true }],
          valuePattern: '^a+$',
        },
      ]);

      expect(
        getObservablesFromEcs(
          [
            [
              {
                field: 'user.id',
                value: ['a'.repeat(MAX_VALUE_LENGTH_FOR_PATTERN + 1), 'a'.repeat(5)],
              },
            ],
          ],
          observableTypes
        )
      ).toEqual([{ typeKey: 'any-id', value: 'aaaaa', description }]);
    });
  });

  describe('with a given map of observable types', () => {
    const description = 'Auto extracted observable';

    it('reads the fields of the given map only', () => {
      const observableTypes = {
        'employee-id': {
          key: 'employee-id',
          label: 'Employee ID',
          paths: [{ path: 'user.employee_id', enabled: true }],
        },
      };

      expect(
        getObservablesFromEcs(
          [
            [
              { field: 'user.employee_id', value: ['E000001'] },
              { field: 'agent.id', value: ['agent-1'] },
            ],
          ],
          observableTypes
        )
      ).toEqual([{ typeKey: 'employee-id', value: 'E000001', description }]);
    });

    it('skips a type with a value pattern that does not compile', () => {
      const observableTypes = {
        broken: {
          key: 'broken',
          label: 'Broken',
          paths: [{ path: 'user.name', enabled: true }],
          valuePattern: '(',
        },
      };

      expect(
        getObservablesFromEcs([[{ field: 'user.name', value: ['alice'] }]], observableTypes)
      ).toEqual([]);
    });
  });
});
