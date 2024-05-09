/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat, EcsVersion } from '@elastic/ecs';

import { checkIndex, EMPTY_PARTITIONED_FIELD_METADATA } from './check_index';
import { EMPTY_STAT } from '../../../../helpers';
import { mockMappingsResponse } from '../../../../mock/mappings_response/mock_mappings_response';
import { mockUnallowedValuesResponse } from '../../../../mock/unallowed_values/mock_unallowed_values';
import { EcsMetadata, UnallowedValueRequestItem } from '../../../../types';

const ecsMetadata = EcsFlat as unknown as Record<string, EcsMetadata>;

let mockFetchMappings = jest.fn(
  ({
    abortController,
    patternOrIndexName,
  }: {
    abortController: AbortController;
    patternOrIndexName: string;
  }) =>
    new Promise((resolve) => {
      resolve(mockMappingsResponse); // happy path
    })
);

jest.mock('../../../../use_mappings/helpers', () => ({
  fetchMappings: ({
    abortController,
    patternOrIndexName,
  }: {
    abortController: AbortController;
    patternOrIndexName: string;
  }) =>
    mockFetchMappings({
      abortController,
      patternOrIndexName,
    }),
}));

const mockFetchUnallowedValues = jest.fn(
  ({
    abortController,
    indexName,
    requestItems,
  }: {
    abortController: AbortController;
    indexName: string;
    requestItems: UnallowedValueRequestItem[];
  }) => new Promise((resolve) => resolve(mockUnallowedValuesResponse))
);

jest.mock('../../../../use_unallowed_values/helpers', () => {
  const original = jest.requireActual('../../../../use_unallowed_values/helpers');

  return {
    ...original,
    fetchUnallowedValues: ({
      abortController,
      indexName,
      requestItems,
    }: {
      abortController: AbortController;
      indexName: string;
      requestItems: UnallowedValueRequestItem[];
    }) =>
      mockFetchUnallowedValues({
        abortController,
        indexName,
        requestItems,
      }),
  };
});

describe('checkIndex', () => {
  const defaultBytesFormat = '0,0.[0]b';
  const formatBytes = (value: number | undefined) =>
    value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

  const defaultNumberFormat = '0,0.[000]';
  const formatNumber = (value: number | undefined) =>
    value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

  const indexName = 'auditbeat-custom-index-1';
  const pattern = 'auditbeat-*';
  const httpFetch = jest.fn();

  describe('when `checkIndex` successfully completes the check', () => {
    const onCheckCompleted = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        ecsMetadata,
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
        version: EcsVersion,
      });
    });

    test('it invokes onCheckCompleted with a null `error`', () => {
      expect(onCheckCompleted.mock.calls[0][0].error).toBeNull();
    });

    test('it invokes onCheckCompleted with the expected `indexName`', () => {
      expect(onCheckCompleted.mock.calls[0][0].indexName).toEqual(indexName);
    });

    test('it invokes onCheckCompleted with the non-default `partitionedFieldMetadata`', () => {
      expect(onCheckCompleted.mock.calls[0][0].partitionedFieldMetadata).not.toEqual(
        EMPTY_PARTITIONED_FIELD_METADATA
      );
    });

    test('it invokes onCheckCompleted with the expected`pattern`', () => {
      expect(onCheckCompleted.mock.calls[0][0].pattern).toEqual(pattern);
    });

    test('it invokes onCheckCompleted with the expected `version`', () => {
      expect(onCheckCompleted.mock.calls[0][0].version).toEqual(EcsVersion);
    });
  });

  describe('happy path, when the signal is aborted', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('it does NOT invoke onCheckCompleted', async () => {
      const onCheckCompleted = jest.fn();

      const abortController = new AbortController();
      abortController.abort();

      await checkIndex({
        abortController,
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        ecsMetadata,
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
        version: EcsVersion,
      });

      expect(onCheckCompleted).not.toBeCalled();
    });
  });

  describe('when `ecsMetadata` is null', () => {
    const onCheckCompleted = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        ecsMetadata: null, // <--
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
        version: EcsVersion,
      });
    });

    test('it invokes onCheckCompleted with a null `error`', () => {
      expect(onCheckCompleted.mock.calls[0][0].error).toBeNull();
    });

    test('it invokes onCheckCompleted with the expected `indexName`', () => {
      expect(onCheckCompleted.mock.calls[0][0].indexName).toEqual(indexName);
    });

    test('it invokes onCheckCompleted with the default `partitionedFieldMetadata`', () => {
      expect(onCheckCompleted.mock.calls[0][0].partitionedFieldMetadata).toEqual(
        EMPTY_PARTITIONED_FIELD_METADATA
      );
    });

    test('it invokes onCheckCompleted with the expected `pattern`', () => {
      expect(onCheckCompleted.mock.calls[0][0].pattern).toEqual(pattern);
    });

    test('it invokes onCheckCompleted with the expected `version`', () => {
      expect(onCheckCompleted.mock.calls[0][0].version).toEqual(EcsVersion);
    });
  });

  describe('when an error occurs', () => {
    const onCheckCompleted = jest.fn();
    const error = 'simulated fetch mappings error';

    beforeEach(async () => {
      jest.clearAllMocks();

      mockFetchMappings = jest.fn(
        ({
          abortController,
          patternOrIndexName,
        }: {
          abortController: AbortController;
          patternOrIndexName: string;
        }) => new Promise((_, reject) => reject(new Error(error)))
      );

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        ecsMetadata,
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
        version: EcsVersion,
      });
    });

    test('it invokes onCheckCompleted with the expected `error`', () => {
      expect(onCheckCompleted.mock.calls[0][0].error).toEqual(error);
    });

    test('it invokes onCheckCompleted with the expected `indexName`', () => {
      expect(onCheckCompleted.mock.calls[0][0].indexName).toEqual(indexName);
    });

    test('it invokes onCheckCompleted with null `partitionedFieldMetadata`', () => {
      expect(onCheckCompleted.mock.calls[0][0].partitionedFieldMetadata).toBeNull();
    });

    test('it invokes onCheckCompleted with the expected `pattern`', () => {
      expect(onCheckCompleted.mock.calls[0][0].pattern).toEqual(pattern);
    });

    test('it invokes onCheckCompleted with the expected `version`', () => {
      expect(onCheckCompleted.mock.calls[0][0].version).toEqual(EcsVersion);
    });
  });

  describe('when an error occurs, but the error does not have a toString', () => {
    const onCheckCompleted = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();

      mockFetchMappings = jest.fn(
        ({
          abortController,
          patternOrIndexName,
        }: {
          abortController: AbortController;
          patternOrIndexName: string;
          // eslint-disable-next-line prefer-promise-reject-errors
        }) => new Promise((_, reject) => reject(undefined))
      );

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        ecsMetadata,
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
        version: EcsVersion,
      });
    });

    test('it invokes onCheckCompleted with the fallback `error`', () => {
      expect(onCheckCompleted.mock.calls[0][0].error).toEqual(
        `An error occurred checking index ${indexName}`
      );
    });

    test('it invokes onCheckCompleted with the expected `indexName`', () => {
      expect(onCheckCompleted.mock.calls[0][0].indexName).toEqual(indexName);
    });

    test('it invokes onCheckCompleted with null `partitionedFieldMetadata`', () => {
      expect(onCheckCompleted.mock.calls[0][0].partitionedFieldMetadata).toBeNull();
    });

    test('it invokes onCheckCompleted with the expected `pattern`', () => {
      expect(onCheckCompleted.mock.calls[0][0].pattern).toEqual(pattern);
    });

    test('it invokes onCheckCompleted with the expected `version`', () => {
      expect(onCheckCompleted.mock.calls[0][0].version).toEqual(EcsVersion);
    });
  });

  describe('when an error occurs, and the signal is aborted', () => {
    const onCheckCompleted = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    const error = 'simulated fetch mappings error';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('it does NOT invoke onCheckCompleted', async () => {
      mockFetchMappings = jest.fn(
        ({
          // eslint-disable-next-line @typescript-eslint/no-shadow
          abortController,
          patternOrIndexName,
        }: {
          abortController: AbortController;
          patternOrIndexName: string;
        }) => new Promise((_, reject) => reject(new Error(error)))
      );

      await checkIndex({
        abortController,
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        ecsMetadata,
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
        version: EcsVersion,
      });

      expect(onCheckCompleted).not.toBeCalled();
    });
  });
});
