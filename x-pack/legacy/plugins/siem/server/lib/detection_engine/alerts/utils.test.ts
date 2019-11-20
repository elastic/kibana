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
import { DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';

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
      const fakeSignalSourceHit = buildBulkBody({
        doc: sampleDocNoSortId,
        signalParams: sampleParams,
        id: sampleSignalId,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
      // Timestamp will potentially always be different so remove it for the test
      delete fakeSignalSourceHit['@timestamp'];
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        signal: {
          parent: {
            id: 'someFakeId',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          original_time: 'someTimeStamp',
          rule: {
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            rule_id: 'rule-1',
            false_positives: [],
            max_signals: 10000,
            risk_score: 50,
            output_index: '.siem-signals',
            description: 'Detecting root and admin users',
            from: 'now-6m',
            immutable: false,
            index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            interval: '5m',
            language: 'kuery',
            name: 'rule-name',
            query: 'user.name: root or user.name: admin',
            references: ['http://google.com'],
            severity: 'high',
            tags: ['some fake tag'],
            type: 'query',
            size: 1000,
            status: 'open',
            to: 'now',
            enabled: true,
            created_by: 'elastic',
            updated_by: 'elastic',
          },
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
      const successfulSingleBulkIndex = await singleBulkIndex({
        someResult: sampleSearchResult,
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
      expect(successfulSingleBulkIndex).toEqual(true);
    });
    test('create unsuccessful bulk index due to empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleEmptyDocSearchResults;
      mockService.callCluster.mockReturnValue(false);
      const successfulSingleBulkIndex = await singleBulkIndex({
        someResult: sampleSearchResult,
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
      const successfulSingleBulkIndex = await singleBulkIndex({
        someResult: sampleSearchResult,
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
        singleSearchAfter({
          searchAfterSortId,
          signalParams: sampleParams,
          services: mockService,
          logger: mockLogger,
        })
      ).rejects.toThrow('Attempted to search after with empty sort id');
    });
    test('if singleSearchAfter works with a given sort id', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      mockService.callCluster.mockReturnValue(sampleDocSearchResultsWithSortId);
      const searchAfterResult = await singleSearchAfter({
        searchAfterSortId,
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
      });
      expect(searchAfterResult).toEqual(sampleDocSearchResultsWithSortId);
    });
    test('if singleSearchAfter throws error', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      mockService.callCluster.mockImplementation(async () => {
        throw Error('Fake Error');
      });
      await expect(
        singleSearchAfter({
          searchAfterSortId,
          signalParams: sampleParams,
          services: mockService,
          logger: mockLogger,
        })
      ).rejects.toThrow('Fake Error');
    });
  });
  describe('searchAfterAndBulkIndex', () => {
    test('if successful with empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const result = await searchAfterAndBulkIndex({
        someResult: sampleEmptyDocSearchResults,
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
      const result = await searchAfterAndBulkIndex({
        someResult: repeatedSearchResultsWithSortId(4),
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(5);
      expect(result).toEqual(true);
    });
    test('if unsuccessful first bulk index', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      mockService.callCluster.mockReturnValue({
        took: 100,
        errors: true, // will cause singleBulkIndex to return false
      });
      const result = await searchAfterAndBulkIndex({
        someResult: repeatedSearchResultsWithSortId(4),
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
      const result = await searchAfterAndBulkIndex({
        someResult: sampleDocSearchResultsNoSortId,
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
      const result = await searchAfterAndBulkIndex({
        someResult: sampleDocSearchResultsNoSortIdNoHits,
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
      const result = await searchAfterAndBulkIndex({
        someResult: repeatedSearchResultsWithSortId(4),
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs and search after returns empty results with no sort ids', async () => {
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
        .mockReturnValueOnce(sampleEmptyDocSearchResults);
      const result = await searchAfterAndBulkIndex({
        someResult: repeatedSearchResultsWithSortId(4),
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
      const result = await searchAfterAndBulkIndex({
        someResult: repeatedSearchResultsWithSortId(4),
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
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
      const result = await searchAfterAndBulkIndex({
        someResult: repeatedSearchResultsWithSortId(4),
        signalParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleSignalId,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
      });
      expect(result).toEqual(false);
    });
  });
});
