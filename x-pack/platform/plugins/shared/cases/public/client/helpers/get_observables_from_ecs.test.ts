/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ObservablePost } from '../../../common/types/api';
import { getIPType, getObservablesFromEcs, processObservable } from './get_observables_from_ecs';

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

  it('should extract user.name as user observable', () => {
    const result = getObservablesFromEcs([[{ field: 'user.name', value: ['admin'] }]]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-user',
        value: 'admin',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should extract user.email as email observable', () => {
    const result = getObservablesFromEcs([[{ field: 'user.email', value: ['test@example.com'] }]]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-email',
        value: 'test@example.com',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should extract process.name as process observable', () => {
    const result = getObservablesFromEcs([[{ field: 'process.name', value: ['svchost.exe'] }]]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-process',
        value: 'svchost.exe',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should extract process.executable as process observable', () => {
    const result = getObservablesFromEcs([
      [{ field: 'process.executable', value: ['C:\\Windows\\System32\\cmd.exe'] }],
    ]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-process',
        value: 'C:\\Windows\\System32\\cmd.exe',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should extract url.full as URL observable', () => {
    const result = getObservablesFromEcs([
      [{ field: 'url.full', value: ['https://example.com/payload'] }],
    ]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-url',
        value: 'https://example.com/payload',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should extract url.original as URL observable', () => {
    const result = getObservablesFromEcs([
      [{ field: 'url.original', value: ['http://evil.test'] }],
    ]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-url',
        value: 'http://evil.test',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should extract registry.path as registry observable', () => {
    const result = getObservablesFromEcs([
      [{ field: 'registry.path', value: ['HKLM\\Software\\Evil'] }],
    ]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-registry',
        value: 'HKLM\\Software\\Evil',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should extract service.name as service observable', () => {
    const result = getObservablesFromEcs([[{ field: 'service.name', value: ['malicious-svc'] }]]);
    expect(result).toEqual([
      {
        typeKey: 'observable-type-service',
        value: 'malicious-svc',
        description: 'Auto extracted observable',
      },
    ]);
  });

  it('should deduplicate process.name and process.executable with same value', () => {
    const result = getObservablesFromEcs([
      [
        { field: 'process.name', value: ['cmd.exe'] },
        { field: 'process.executable', value: ['cmd.exe'] },
      ],
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('cmd.exe');
  });

  it('should deduplicate url.full and url.original with same value', () => {
    const result = getObservablesFromEcs([
      [
        { field: 'url.full', value: ['https://example.com'] },
        { field: 'url.original', value: ['https://example.com'] },
      ],
    ]);
    expect(result).toHaveLength(1);
  });
});
