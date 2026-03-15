/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ECS_FIELD_MAPPINGS,
  buildFieldMappingIndex,
  getRegisteredEcsFields,
} from './ecs_field_mappings';
import {
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_URL,
  OBSERVABLE_TYPE_USER,
  OBSERVABLE_TYPE_PROCESS,
  OBSERVABLE_TYPE_REGISTRY,
  OBSERVABLE_TYPE_SERVICE,
} from '../constants/observables';

describe('DEFAULT_ECS_FIELD_MAPPINGS', () => {
  it('contains mappings for all original 7 extraction fields plus 6 new ones', () => {
    const fields = getRegisteredEcsFields(DEFAULT_ECS_FIELD_MAPPINGS);

    // Original fields
    expect(fields.has('source.ip')).toBe(true);
    expect(fields.has('destination.ip')).toBe(true);
    expect(fields.has('host.name')).toBe(true);
    expect(fields.has('file.path')).toBe(true);
    expect(fields.has('dns.question.name')).toBe(true);
    expect(fields.has('agent.id')).toBe(true);

    // Hash fields (3 parents × 8 hash types = 24)
    expect(fields.has('file.hash.sha256')).toBe(true);
    expect(fields.has('process.hash.md5')).toBe(true);
    expect(fields.has('dll.hash.sha1')).toBe(true);

    // New fields
    expect(fields.has('user.name')).toBe(true);
    expect(fields.has('user.email')).toBe(true);
    expect(fields.has('process.name')).toBe(true);
    expect(fields.has('process.executable')).toBe(true);
    expect(fields.has('url.full')).toBe(true);
    expect(fields.has('url.original')).toBe(true);
    expect(fields.has('registry.path')).toBe(true);
    expect(fields.has('service.name')).toBe(true);
  });

  it('maps new fields to correct observable types', () => {
    const index = buildFieldMappingIndex(DEFAULT_ECS_FIELD_MAPPINGS);

    expect(index.get('user.name')?.typeKey).toBe(OBSERVABLE_TYPE_USER.key);
    expect(index.get('user.email')?.typeKey).toBe(OBSERVABLE_TYPE_EMAIL.key);
    expect(index.get('process.name')?.typeKey).toBe(OBSERVABLE_TYPE_PROCESS.key);
    expect(index.get('process.executable')?.typeKey).toBe(OBSERVABLE_TYPE_PROCESS.key);
    expect(index.get('url.full')?.typeKey).toBe(OBSERVABLE_TYPE_URL.key);
    expect(index.get('url.original')?.typeKey).toBe(OBSERVABLE_TYPE_URL.key);
    expect(index.get('registry.path')?.typeKey).toBe(OBSERVABLE_TYPE_REGISTRY.key);
    expect(index.get('service.name')?.typeKey).toBe(OBSERVABLE_TYPE_SERVICE.key);
  });

  it('uses ip strategy only for IP fields', () => {
    const ipMappings = DEFAULT_ECS_FIELD_MAPPINGS.filter((m) => m.strategy === 'ip');
    expect(ipMappings.map((m) => m.ecsField).sort()).toEqual(['destination.ip', 'source.ip']);
  });

  it('uses static strategy for all non-IP fields', () => {
    const staticMappings = DEFAULT_ECS_FIELD_MAPPINGS.filter((m) => m.strategy === 'static');
    expect(staticMappings.length).toBe(DEFAULT_ECS_FIELD_MAPPINGS.length - 2);
  });
});

describe('buildFieldMappingIndex', () => {
  it('returns a Map with O(1) lookups by field name', () => {
    const index = buildFieldMappingIndex(DEFAULT_ECS_FIELD_MAPPINGS);

    expect(index.get('host.name')).toEqual({
      ecsField: 'host.name',
      typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
      strategy: 'static',
    });
  });

  it('handles empty mappings array', () => {
    const index = buildFieldMappingIndex([]);
    expect(index.size).toBe(0);
  });

  it('last mapping wins for duplicate fields', () => {
    const mappings = [
      { ecsField: 'x', typeKey: 'first', strategy: 'static' as const },
      { ecsField: 'x', typeKey: 'second', strategy: 'static' as const },
    ];
    const index = buildFieldMappingIndex(mappings);
    expect(index.get('x')?.typeKey).toBe('second');
  });
});

describe('getRegisteredEcsFields', () => {
  it('returns a set of all unique ECS field names', () => {
    const fields = getRegisteredEcsFields(DEFAULT_ECS_FIELD_MAPPINGS);
    expect(fields.size).toBe(DEFAULT_ECS_FIELD_MAPPINGS.length);
  });
});
