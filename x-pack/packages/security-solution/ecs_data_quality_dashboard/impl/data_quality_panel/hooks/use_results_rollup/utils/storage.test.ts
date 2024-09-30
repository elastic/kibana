/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { mockPartitionedFieldMetadataWithSameFamily } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata_with_same_family';
import { StorageResult } from '../types';
import { formatStorageResult, getStorageResults, postStorageResult } from './storage';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

describe('formatStorageResult', () => {
  it('should correctly format the input data into a StorageResult object', () => {
    const inputData: Parameters<typeof formatStorageResult>[number] = {
      result: {
        indexName: 'testIndex',
        pattern: 'testPattern',
        checkedAt: 1627545600000,
        docsCount: 100,
        incompatible: 3,
        sameFamily: 1,
        ilmPhase: 'hot',
        markdownComments: ['test comments'],
        error: null,
      },
      report: {
        batchId: 'testBatch',
        isCheckAll: true,
        sameFamilyFields: ['agent.type'],
        unallowedMappingFields: ['event.category', 'host.name', 'source.ip'],
        unallowedValueFields: ['event.category'],
        sizeInBytes: 5000,
        ecsVersion: '1.0.0',
        indexName: 'testIndex',
        indexId: 'testIndexId',
      },
      partitionedFieldMetadata: mockPartitionedFieldMetadataWithSameFamily,
    };

    const expectedResult: StorageResult = {
      batchId: 'testBatch',
      indexName: 'testIndex',
      indexPattern: 'testPattern',
      isCheckAll: true,
      checkedAt: 1627545600000,
      docsCount: 100,
      totalFieldCount: 10,
      ecsFieldCount: 2,
      customFieldCount: 4,
      incompatibleFieldCount: 3,
      incompatibleFieldMappingItems: [
        {
          fieldName: 'event.category',
          expectedValue: 'keyword',
          actualValue: 'constant_keyword',
          description:
            'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
        },
        {
          fieldName: 'host.name',
          expectedValue: 'keyword',
          actualValue: 'text',
          description:
            'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
        },
        {
          fieldName: 'source.ip',
          expectedValue: 'ip',
          actualValue: 'text',
          description: 'IP address of the source (IPv4 or IPv6).',
        },
      ],
      incompatibleFieldValueItems: [
        {
          fieldName: 'event.category',
          expectedValues: [
            'authentication',
            'configuration',
            'database',
            'driver',
            'email',
            'file',
            'host',
            'iam',
            'intrusion_detection',
            'malware',
            'network',
            'package',
            'process',
            'registry',
            'session',
            'threat',
            'vulnerability',
            'web',
          ],
          actualValues: [{ name: 'an_invalid_category', count: 2 }],
          description:
            'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
        },
      ],
      sameFamilyFieldCount: 1,
      sameFamilyFields: ['agent.type'],
      sameFamilyFieldItems: [
        {
          fieldName: 'agent.type',
          expectedValue: 'keyword',
          actualValue: 'constant_keyword',
          description:
            'Type of the agent.\nThe agent type always stays the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
        },
      ],
      unallowedMappingFields: ['event.category', 'host.name', 'source.ip'],
      unallowedValueFields: ['event.category'],
      sizeInBytes: 5000,
      ilmPhase: 'hot',
      markdownComments: ['test comments'],
      ecsVersion: '1.0.0',
      indexId: 'testIndexId',
      error: null,
    };

    expect(formatStorageResult(inputData)).toEqual(expectedResult);
  });
});

describe('postStorageResult', () => {
  const { fetch } = httpServiceMock.createStartContract();
  const { toasts } = notificationServiceMock.createStartContract();
  beforeEach(() => {
    fetch.mockClear();
  });

  test('it posts the result', async () => {
    const storageResult = { indexName: 'test' } as unknown as StorageResult;
    await postStorageResult({
      storageResult,
      httpFetch: fetch,
      abortController: new AbortController(),
      toasts,
    });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/ecs_data_quality_dashboard/results',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(storageResult),
      })
    );
  });

  test('it throws error', async () => {
    const storageResult = { indexName: 'test' } as unknown as StorageResult;
    fetch.mockRejectedValueOnce('test-error');
    await postStorageResult({
      httpFetch: fetch,
      storageResult,
      abortController: new AbortController(),
      toasts,
    });
    expect(toasts.addError).toHaveBeenCalledWith('test-error', { title: expect.any(String) });
  });
});

describe('getStorageResults', () => {
  const { fetch } = httpServiceMock.createStartContract();
  const { toasts } = notificationServiceMock.createStartContract();
  beforeEach(() => {
    fetch.mockClear();
  });

  test('it gets the results', async () => {
    await getStorageResults({
      httpFetch: fetch,
      abortController: new AbortController(),
      pattern: 'auditbeat-*',
      toasts,
    });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/ecs_data_quality_dashboard/results_latest/auditbeat-*',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('should catch error', async () => {
    fetch.mockRejectedValueOnce('test-error');

    const results = await getStorageResults({
      httpFetch: fetch,
      abortController: new AbortController(),
      pattern: 'auditbeat-*',
      toasts,
    });

    expect(toasts.addError).toHaveBeenCalledWith('test-error', { title: expect.any(String) });
    expect(results).toEqual([]);
  });
});
