/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldsMetadataClient } from './fields_metadata_client';
import type { HttpStart } from '@kbn/core/public';

describe('FieldsMetadataClient - client-side proxy support', () => {
  let fieldsMetadataClient: FieldsMetadataClient;
  let httpMock: jest.Mocked<HttpStart>;

  beforeEach(() => {
    httpMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpStart>;

    fieldsMetadataClient = new FieldsMetadataClient(httpMock);
  });

  it('should allow accessing base fields from find() result', async () => {
    const mockResponse = {
      fields: {
        '@timestamp': {
          name: '@timestamp',
          type: 'date',
          description: 'Timestamp field',
        },
        'service.name': {
          name: 'name',
          flat_name: 'service.name',
          type: 'keyword',
          description: 'Service name',
        },
      },
    };

    httpMock.get.mockResolvedValue(mockResponse);

    const result = await fieldsMetadataClient.find({ fieldNames: ['@timestamp', 'service.name'] });

    expect(result.fields['@timestamp']).toBeDefined();
    expect(result.fields['@timestamp'].name).toBe('@timestamp');
    expect(result.fields['service.name']).toBeDefined();
    expect(result.fields['service.name'].flat_name).toBe('service.name');
  });

  it('should allow accessing prefixed fields via proxy on client side', async () => {
    const mockResponse = {
      fields: {
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
      },
    };

    httpMock.get.mockResolvedValue(mockResponse);

    const result = await fieldsMetadataClient.find({});

    // Access via attributes.* prefix
    const attributesField = result.fields['attributes.service.name'];
    expect(attributesField).toBeDefined();
    expect(attributesField?.name).toBe('attributes.service.name');
    expect(attributesField?.flat_name).toBe('attributes.service.name');
    expect(attributesField?.description).toBe('Service name');
    expect(attributesField?.type).toBe('keyword');

    // Access via resource.attributes.* prefix
    const resourceAttributesField = result.fields['resource.attributes.host.name'];
    expect(resourceAttributesField).toBeDefined();
    expect(resourceAttributesField?.name).toBe('resource.attributes.host.name');
    expect(resourceAttributesField?.flat_name).toBe('resource.attributes.host.name');
    expect(resourceAttributesField?.description).toBe('Host name');
    expect(resourceAttributesField?.type).toBe('keyword');
  });

  it('should return undefined for non-existent prefixed fields', async () => {
    const mockResponse = {
      fields: {
        'service.name': {
          name: 'name',
          flat_name: 'service.name',
          type: 'keyword',
          description: 'Service name',
        },
      },
    };

    httpMock.get.mockResolvedValue(mockResponse);

    const result = await fieldsMetadataClient.find({});

    expect(result.fields['attributes.nonexistent.field']).toBeUndefined();
    expect(result.fields['resource.attributes.nonexistent.field']).toBeUndefined();
  });

  it('should support "in" operator for prefixed fields on client side', async () => {
    const mockResponse = {
      fields: {
        '@timestamp': {
          name: '@timestamp',
          type: 'date',
        },
        'service.name': {
          name: 'name',
          flat_name: 'service.name',
          type: 'keyword',
        },
      },
    };

    httpMock.get.mockResolvedValue(mockResponse);

    const result = await fieldsMetadataClient.find({});

    // Base fields
    expect('service.name' in result.fields).toBe(true);
    expect('@timestamp' in result.fields).toBe(true);

    // Prefixed fields
    expect('attributes.service.name' in result.fields).toBe(true);
    expect('resource.attributes.@timestamp' in result.fields).toBe(true);

    // Non-existent
    expect('nonexistent' in result.fields).toBe(false);
    expect('attributes.nonexistent' in result.fields).toBe(false);
  });

  it('should not enumerate prefixed fields to avoid payload bloat', async () => {
    const mockResponse = {
      fields: {
        '@timestamp': { name: '@timestamp', type: 'date' },
        'service.name': { name: 'name', flat_name: 'service.name', type: 'keyword' },
        'host.name': { name: 'name', flat_name: 'host.name', type: 'keyword' },
      },
    };

    httpMock.get.mockResolvedValue(mockResponse);

    const result = await fieldsMetadataClient.find({});
    const keys = Object.keys(result.fields);

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

  it('should cache proxied results', async () => {
    const mockResponse = {
      fields: {
        'service.name': {
          name: 'name',
          flat_name: 'service.name',
          type: 'keyword',
        },
      },
    };

    httpMock.get.mockResolvedValue(mockResponse);

    const params = { fieldNames: ['service.name'] };

    // First call
    const result1 = await fieldsMetadataClient.find(params);
    expect(httpMock.get).toHaveBeenCalledTimes(1);

    // Second call with same params - should use cache
    const result2 = await fieldsMetadataClient.find(params);
    expect(httpMock.get).toHaveBeenCalledTimes(1); // Still 1, not called again

    // Both results should support proxy access
    expect(result1.fields['attributes.service.name']).toBeDefined();
    expect(result2.fields['attributes.service.name']).toBeDefined();
  });
});
