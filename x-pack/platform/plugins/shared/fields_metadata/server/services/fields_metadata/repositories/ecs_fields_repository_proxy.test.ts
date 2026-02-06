/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFieldsRepository } from './ecs_fields_repository';
import type { EcsFieldsRepositoryDeps } from './ecs_fields_repository';

describe('EcsFieldsRepository - find() with proxy support', () => {
  let ecsFieldsRepository: EcsFieldsRepository;

  beforeEach(() => {
    const mockEcsFields = {
      '@timestamp': {
        name: '@timestamp',
        flat_name: '@timestamp',
        type: 'date',
        description: 'Timestamp field',
      },
      'service.name': {
        name: 'name',
        flat_name: 'service.name',
        type: 'keyword',
        description: 'Service name',
      },
      'host.name': {
        name: 'name',
        flat_name: 'host.name',
        type: 'keyword',
        description: 'Host name',
      },
    };

    ecsFieldsRepository = EcsFieldsRepository.create({
      ecsFields: mockEcsFields as unknown as EcsFieldsRepositoryDeps['ecsFields'],
    });
  });

  it('should allow accessing base fields from find() result', () => {
    const fieldsDictionary = ecsFieldsRepository.find();
    const fields = fieldsDictionary.getFields();

    expect(fields['@timestamp']).toBeDefined();
    expect(fields['@timestamp'].name).toBe('@timestamp');
    expect(fields['service.name']).toBeDefined();
    expect(fields['service.name'].flat_name).toBe('service.name');
  });

  it('should allow accessing prefixed fields from find() result via proxy', () => {
    const fieldsDictionary = ecsFieldsRepository.find();
    const fields = fieldsDictionary.getFields();

    // Access via attributes.* prefix
    const attributesField = fields['attributes.service.name'];
    expect(attributesField).toBeDefined();
    expect(attributesField?.name).toBe('attributes.service.name');
    expect(attributesField?.flat_name).toBe('attributes.service.name');
    expect(attributesField?.description).toBe('Service name');
    expect(attributesField?.type).toBe('keyword');
  });

  it('should allow accessing resource.attributes.* prefixed fields from find() result via proxy', () => {
    const fieldsDictionary = ecsFieldsRepository.find();
    const fields = fieldsDictionary.getFields();

    // Access via resource.attributes.* prefix
    const resourceAttributesField = fields['resource.attributes.host.name'];
    expect(resourceAttributesField).toBeDefined();
    expect(resourceAttributesField?.name).toBe('resource.attributes.host.name');
    expect(resourceAttributesField?.flat_name).toBe('resource.attributes.host.name');
    expect(resourceAttributesField?.description).toBe('Host name');
    expect(resourceAttributesField?.type).toBe('keyword');
  });

  it('should return undefined for non-existent prefixed fields', () => {
    const fieldsDictionary = ecsFieldsRepository.find();
    const fields = fieldsDictionary.getFields();

    expect(fields['attributes.nonexistent.field']).toBeUndefined();
    expect(fields['resource.attributes.nonexistent.field']).toBeUndefined();
  });

  it('should support "in" operator for prefixed fields', () => {
    const fieldsDictionary = ecsFieldsRepository.find();
    const fields = fieldsDictionary.getFields();

    // Base fields
    expect('service.name' in fields).toBe(true);
    expect('@timestamp' in fields).toBe(true);

    // Prefixed fields
    expect('attributes.service.name' in fields).toBe(true);
    expect('resource.attributes.host.name' in fields).toBe(true);

    // Non-existent
    expect('nonexistent' in fields).toBe(false);
    expect('attributes.nonexistent' in fields).toBe(false);
  });

  it('should not enumerate prefixed fields to avoid payload bloat', () => {
    const fieldsDictionary = ecsFieldsRepository.find();
    const fields = fieldsDictionary.getFields();

    const keys = Object.keys(fields);

    // Should contain base fields
    expect(keys).toContain('@timestamp');
    expect(keys).toContain('service.name');
    expect(keys).toContain('host.name');

    // Should NOT enumerate prefixed variants
    expect(keys).not.toContain('attributes.service.name');
    expect(keys).not.toContain('resource.attributes.host.name');

    // Verify count matches base fields only
    expect(keys.length).toBe(3);
  });

  it('should maintain consistency between getByName and find() access', () => {
    const fieldsDictionary = ecsFieldsRepository.find();
    const fields = fieldsDictionary.getFields();

    // Get via getByName
    const viaGetByName = ecsFieldsRepository.getByName('attributes.service.name');

    // Get via find() + proxy
    const viaFind = fields['attributes.service.name'];

    // Both should return equivalent metadata
    expect(viaGetByName).toBeDefined();
    expect(viaFind).toBeDefined();
    expect(viaGetByName?.name).toBe(viaFind?.name);
    expect(viaGetByName?.flat_name).toBe(viaFind?.flat_name);
    expect(viaGetByName?.description).toBe(viaFind?.description);
    expect(viaGetByName?.type).toBe(viaFind?.type);
  });
});
