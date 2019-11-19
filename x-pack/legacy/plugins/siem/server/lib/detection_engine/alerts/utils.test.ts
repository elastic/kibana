/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { savedObjectsClientMock } from 'src/core/server/mocks';

import { Logger } from '../../../../../../../../src/core/server';
import {
  buildBulkBody,
  singleBulkIndex,
  singleSearchAfter,
  searchAfterAndBulkIndex,
} from './utils';
import {
  sampleDocNoSortId,
  sampleSignalAlertParams,
  sampleDocSearchResultsNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
  sampleDocSearchResultsWithSortId,
  sampleEmptyDocSearchResults,
  repeatedSearchResultsWithSortId,
  sampleSignalId,
} from './__mocks__/es_results';

const mockLogger: Logger = {
  log: jest.fn(),
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

const mockService = {
  callCluster: jest.fn(),
  alertInstanceFactory: jest.fn(),
  savedObjectsClient: savedObjectsClientMock.create(),
};

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('buildBulkBody', () => {
    test('if bulk body builds well-defined body', () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const fakeSignalSourceHit = buildBulkBody(sampleDocNoSortId, sampleParams, sampleSignalId);
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        '@timestamp': 'someTimeStamp',
        signal: {
          id: sampleSignalId,
          '@timestamp': fakeSignalSourceHit.signal['@timestamp'], // timestamp generated in the body
          rule_revision: 1,
          rule_id: sampleParams.ruleId,
          rule_type: sampleParams.type,
          parent: {
            id: sampleDocNoSortId._id,
            type: 'event',
            index: sampleDocNoSortId._index,
            depth: 1,
          },
          name: sampleParams.name,
          severity: sampleParams.severity,
          description: sampleParams.description,
          original_time: sampleDocNoSortId._source['@timestamp'],
          index_patterns: sampleParams.index,
          references: sampleParams.references,
        },
      });
    });
  });
  describe('singleBulkIndex', () => {
    test('create successful bulk index', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleDocSearchResultsNoSortId;
      mockService.callCluster.mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      });
      const successfulSingleBulkIndex = await singleBulkIndex(
        sampleSearchResult,
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(successfulSingleBulkIndex).toEqual(true);
    });
    test('create unsuccessful bulk index due to empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleEmptyDocSearchResults;
      mockService.callCluster.mockReturnValue(false);
      const successfulSingleBulkIndex = await singleBulkIndex(
        sampleSearchResult,
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(successfulSingleBulkIndex).toEqual(true);
    });
    test('create unsuccessful bulk index due to bulk index errors', async () => {
      // need a sample search result, sample signal params, mock service, mock logger
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleDocSearchResultsNoSortId;
      mockService.callCluster.mockReturnValue({
        took: 100,
        errors: true,
      });
      const successfulSingleBulkIndex = await singleBulkIndex(
        sampleSearchResult,
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(mockLogger.error).toHaveBeenCalled();
      expect(successfulSingleBulkIndex).toEqual(false);
    });
  });
  describe('singleSearchAfter', () => {
    test('if singleSearchAfter works without a given sort id', async () => {
      let searchAfterSortId;
      const sampleParams = sampleSignalAlertParams(undefined);
      mockService.callCluster.mockReturnValue(sampleDocSearchResultsNoSortId);
      await expect(
        singleSearchAfter(searchAfterSortId, sampleParams, mockService, mockLogger)
      ).rejects.toThrow('Attempted to search after with empty sort id');
    });
    test('if singleSearchAfter works with a given sort id', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      mockService.callCluster.mockReturnValue(sampleDocSearchResultsWithSortId);
      const searchAfterResult = await singleSearchAfter(
        searchAfterSortId,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(searchAfterResult).toEqual(sampleDocSearchResultsWithSortId);
    });
    test('if singleSearchAfter throws error', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      mockService.callCluster.mockImplementation(async () => {
        throw Error('Fake Error');
      });
      await expect(
        singleSearchAfter(searchAfterSortId, sampleParams, mockService, mockLogger)
      ).rejects.toThrow('Fake Error');
    });
  });
  describe('searchAfterAndBulkIndex', () => {
    test('if successful with empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const result = await searchAfterAndBulkIndex(
        sampleEmptyDocSearchResults,
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(mockService.callCluster).toHaveBeenCalledTimes(0);
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      mockService.callCluster
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        })
        .mockReturnValueOnce(repeatedSearchResultsWithSortId(4))
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        })
        .mockReturnValueOnce(repeatedSearchResultsWithSortId(4))
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        });
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(mockService.callCluster).toHaveBeenCalledTimes(5);
      expect(result).toEqual(true);
    });
    test('if unsuccessful first bulk index', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      mockService.callCluster.mockReturnValue({
        took: 100,
        errors: true, // will cause singleBulkIndex to return false
      });
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkIndex due to empty sort ids', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);

      mockService.callCluster.mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      });
      const result = await searchAfterAndBulkIndex(
        sampleDocSearchResultsNoSortId,
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkIndex due to empty sort ids and 0 total hits', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      mockService.callCluster.mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      });
      const result = await searchAfterAndBulkIndex(
        sampleDocSearchResultsNoSortIdNoHits,
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs and search after returns results with no sort ids', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      mockService.callCluster
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        })
        .mockReturnValueOnce(sampleDocSearchResultsNoSortId);
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(result).toEqual(true);
    });
    test('if logs error when iteration is unsuccessful when bulk index results in a failure', async () => {
      const sampleParams = sampleSignalAlertParams(5);
      mockService.callCluster
        .mockReturnValueOnce({
          // first bulk insert
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        })
        .mockReturnValueOnce(sampleDocSearchResultsWithSortId); // get some more docs
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual(true);
    });
    test('if returns false when singleSearchAfter throws an exception', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      mockService.callCluster
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        })
        .mockRejectedValueOnce(Error('Fake Error'));
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger,
        sampleSignalId
      );
      expect(result).toEqual(false);
    });
  });
});
