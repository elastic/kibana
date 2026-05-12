/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE } from '../constants';
import {
  UiamApiKeyProvisioningStatus,
  UiamApiKeyProvisioningEntityType,
} from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import { getExcludeRulesFilter, buildChunkedOrNode } from './get_exclude_rules_filter';

function createStatusSavedObject(
  entityId: string,
  status: UiamApiKeyProvisioningStatus = UiamApiKeyProvisioningStatus.COMPLETED,
  message?: string,
  errorCode?: string
) {
  return {
    id: entityId,
    type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    attributes: {
      entityId,
      entityType: UiamApiKeyProvisioningEntityType.RULE,
      status,
      ...(message ? { message } : {}),
      ...(errorCode ? { errorCode } : {}),
    },
    references: [],
    score: 1,
  };
}

describe('getExcludeRulesFilter', () => {
  it('returns undefined when there are no status docs', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 500,
      page: 1,
    });

    const result = await getExcludeRulesFilter(client);
    expect(result).toBeUndefined();
  });

  it('returns a NOT filter wrapping rule IDs', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find.mockResolvedValue({
      saved_objects: [createStatusSavedObject('rule-1'), createStatusSavedObject('rule-2')],
      total: 2,
      per_page: 500,
      page: 1,
    });

    const result = await getExcludeRulesFilter(client);
    expect(result).toBeDefined();
    expect(result!.type).toBe('function');
    expect(result!.function).toBe('not');
    const orNode = result!.arguments[0];
    expect(orNode.function).toBe('or');
    expect(orNode.arguments).toHaveLength(2);
  });

  it('includes failed non-Cloud-user conversion errors in the exclusion query', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find.mockResolvedValue({
      saved_objects: [
        createStatusSavedObject(
          'rule-1',
          UiamApiKeyProvisioningStatus.FAILED,
          undefined,
          NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE
        ),
      ],
      total: 1,
      per_page: 500,
      page: 1,
    });

    const result = await getExcludeRulesFilter(client);

    expect(result).toBeDefined();
    const findFilter = client.find.mock.calls[0][0].filter;
    expect(findFilter.function).toBe('and');
    expect(findFilter.arguments[0].function).toBe('or');
    expect(findFilter.arguments[0].arguments).toContainEqual(
      expect.objectContaining({
        function: 'and',
        arguments: expect.arrayContaining([
          expect.objectContaining({
            function: 'is',
            arguments: expect.arrayContaining([
              expect.objectContaining({
                value: `${UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE}.attributes.status`,
              }),
              expect.objectContaining({ value: UiamApiKeyProvisioningStatus.FAILED }),
            ]),
          }),
          expect.objectContaining({
            function: 'is',
            arguments: expect.arrayContaining([
              expect.objectContaining({
                value: `${UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE}.attributes.errorCode`,
              }),
              expect.objectContaining({
                value: NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE,
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it('paginates through multiple pages of status docs', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find
      .mockResolvedValueOnce({
        saved_objects: [createStatusSavedObject('rule-1')],
        total: 2,
        per_page: 1,
        page: 1,
      })
      .mockResolvedValueOnce({
        saved_objects: [createStatusSavedObject('rule-2')],
        total: 2,
        per_page: 1,
        page: 2,
      });

    jest.replaceProperty(
      await import('../constants'),
      'GET_STATUS_BATCH_SIZE' as never,
      1 as never
    );

    const result = await getExcludeRulesFilter(client);
    expect(result).toBeDefined();
    expect(client.find).toHaveBeenCalledTimes(2);
  });

  it('deduplicates rule IDs across pages', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find.mockResolvedValue({
      saved_objects: [
        createStatusSavedObject('rule-1'),
        createStatusSavedObject('rule-1'),
        createStatusSavedObject('rule-2'),
      ],
      total: 3,
      per_page: 500,
      page: 1,
    });

    const result = await getExcludeRulesFilter(client);
    expect(result).toBeDefined();
    const orNode = result!.arguments[0];
    expect(orNode.function).toBe('or');
    expect(orNode.arguments).toHaveLength(2);
  });
});

describe('buildChunkedOrNode', () => {
  it('returns a single or node when IDs fit within chunkSize', () => {
    const result = buildChunkedOrNode(['id-1', 'id-2'], 5);
    expect(result.function).toBe('or');
    expect(result.arguments).toHaveLength(2);
    expect(result.arguments[0].function).toBe('is');
    expect(result.arguments[1].function).toBe('is');
  });

  it('returns a single or node when IDs exactly equal chunkSize', () => {
    const ids = Array.from({ length: 3 }, (_, i) => `id-${i}`);
    const result = buildChunkedOrNode(ids, 3);
    expect(result.function).toBe('or');
    expect(result.arguments).toHaveLength(3);
    expect(result.arguments.every((arg: { function: string }) => arg.function === 'is')).toBe(true);
  });

  it('splits into nested or nodes when IDs exceed chunkSize', () => {
    const ids = Array.from({ length: 5 }, (_, i) => `id-${i}`);
    const result = buildChunkedOrNode(ids, 2);

    expect(result.function).toBe('or');
    expect(result.arguments).toHaveLength(3);

    expect(result.arguments[0].function).toBe('or');
    expect(result.arguments[0].arguments).toHaveLength(2);

    expect(result.arguments[1].function).toBe('or');
    expect(result.arguments[1].arguments).toHaveLength(2);

    // Last chunk has the remainder
    expect(result.arguments[2].function).toBe('is');
  });

  it('handles a single ID', () => {
    const result = buildChunkedOrNode(['id-1'], 1024);
    expect(result.function).toBe('is');
  });

  it('builds correct leaf nodes with alert.id values', () => {
    const result = buildChunkedOrNode(['rule-abc'], 10);
    expect(result.function).toBe('is');
    expect(result.arguments[0]).toEqual({
      type: 'literal',
      value: 'alert.id',
      isQuoted: false,
    });
    expect(result.arguments[1]).toEqual({
      type: 'literal',
      value: 'alert:rule-abc',
      isQuoted: false,
    });
  });
});
