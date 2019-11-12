/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BulkIndexDocumentsParams, SearchParams } from 'elasticsearch';
import { savedObjectsClientMock } from 'src/core/server/mocks';

import { AlertServices } from '../../../../../alerting/server/types';
import { Logger } from '../../../../../../../../src/core/server';
import {
  buildBulkBody,
  singleBulkIndex,
  singleSearchAfter,
  searchAfterAndBulkIndex,
} from './utils';
import { SignalHit } from '../../types';
import {
  sampleDocNoSortId,
  sampleSignalAlertParams,
  sampleDocSearchResultsNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
  sampleDocSearchResultsWithSortId,
  sampleEmptyDocSearchResults,
  repeatedSearchResultsWithSortId,
} from './__mocks__/es_results';
import { SignalAlertParams } from './types';
import { buildEventsSearchQuery } from './build_events_query';

const mockLogger: Logger = {
  info: jest.fn((logString: string) => {
    return logString;
  }),
  warn: jest.fn((logString: string) => {
    return logString;
  }),
  trace: jest.fn(),
  debug: jest.fn((logString: string) => {
    return logString;
  }),
  error: jest.fn((logString: string) => {
    return logString;
  }),
  fatal: jest.fn(),
  log: jest.fn(),
};
describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('buildBulkBody', () => {
    test('if bulk body builds well-defined body', () => {
      const sampleParams: SignalAlertParams = sampleSignalAlertParams(undefined);
      const fakeSignalSourceHit = buildBulkBody(sampleDocNoSortId, sampleParams);
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        '@timestamp': 'someTimeStamp',
        signal: {
          '@timestamp': fakeSignalSourceHit.signal['@timestamp'], // timestamp generated in the body
          rule_revision: 1,
          rule_id: sampleParams.id,
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
      const savedObjectsClient = savedObjectsClientMock.create();
      const bulkBody = sampleDocSearchResultsNoSortId.hits.hits.flatMap(doc => [
        {
          index: {
            _index: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
            _id: doc._id,
          },
        },
        buildBulkBody(doc, sampleParams),
      ]);
      const mockService: AlertServices = {
        callCluster: async (action: string, params: BulkIndexDocumentsParams) => {
          expect(action).toEqual('bulk');
          expect(params.index).toEqual('.siem-signals-10-01-2019');

          // timestamps are annoying...
          (bulkBody[1] as SignalHit).signal['@timestamp'] = params.body[1].signal['@timestamp'];
          expect(params.body).toEqual(bulkBody);
          return {
            took: 100,
            errors: false,
            items: [
              {
                fakeItemValue: 'fakeItemKey',
              },
            ],
          };
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const successfulSingleBulkIndex = await singleBulkIndex(
        sampleSearchResult,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledTimes(0);
      expect(successfulSingleBulkIndex).toEqual(true);
    });
    test('create unsuccessful bulk index due to empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleEmptyDocSearchResults;
      const savedObjectsClient = savedObjectsClientMock.create();
      const mockService: AlertServices = {
        callCluster: async (action: string, params: BulkIndexDocumentsParams) => {
          expect(action).toEqual('bulk');
          expect(params.index).toEqual('.siem-signals-10-01-2019');
          return false; // value is irrelevant
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const successfulSingleBulkIndex = await singleBulkIndex(
        sampleSearchResult,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.debug).toHaveBeenCalledTimes(0);
      expect(mockLogger.error).toHaveBeenCalledTimes(0);
      expect(successfulSingleBulkIndex).toEqual(true);
    });
    test('create unsuccessful bulk index due to bulk index errors', async () => {
      // need a sample search result, sample signal params, mock service, mock logger
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleDocSearchResultsNoSortId;
      const savedObjectsClient = savedObjectsClientMock.create();
      const bulkBody = sampleDocSearchResultsNoSortId.hits.hits.flatMap(doc => [
        {
          index: {
            _index: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
            _id: doc._id,
          },
        },
        buildBulkBody(doc, sampleParams),
      ]);
      const mockService: AlertServices = {
        callCluster: async (action: string, params: BulkIndexDocumentsParams) => {
          expect(action).toEqual('bulk');
          expect(params.index).toEqual('.siem-signals-10-01-2019');

          // timestamps are annoying...
          (bulkBody[1] as SignalHit).signal['@timestamp'] = params.body[1].signal['@timestamp'];
          expect(params.body).toEqual(bulkBody);
          return {
            took: 100,
            errors: true,
          };
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const successfulSingleBulkIndex = await singleBulkIndex(
        sampleSearchResult,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledTimes(0);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(successfulSingleBulkIndex).toEqual(false);
    });
  });
  describe('singleSearchAfter', () => {
    test('if singleSearchAfter works without a given sort id', async () => {
      let searchAfterSortId;
      const sampleParams = sampleSignalAlertParams(undefined);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        maxDocs: undefined,
        searchAfterSortId: undefined,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          return sampleDocSearchResultsNoSortId;
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      try {
        const searchAfterResult = await singleSearchAfter(
          searchAfterSortId,
          sampleParams,
          mockService,
          mockLogger
        );
        expect(searchAfterResult).toBeEmpty();
      } catch (exc) {
        expect(exc.message).toEqual('Attempted to search after with empty sort id');
      }
    });
    test('if singleSearchAfter works with a given sort id', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: undefined,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          return sampleDocSearchResultsWithSortId;
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
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
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: undefined,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          throw Error('Fake Error');
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      try {
        await singleSearchAfter(searchAfterSortId, sampleParams, mockService, mockLogger);
      } catch (exc) {
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(exc.message).toEqual('Fake Error');
      }
    });
  });
  describe('searchAfterAndBulkIndex', () => {
    test('if successful with empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const savedObjectsClient = savedObjectsClientMock.create();
      const mockService: AlertServices = {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        sampleEmptyDocSearchResults,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockService.callCluster).toHaveBeenCalledTimes(0);
      expect(result).toEqual(true);
    });
    test('if one successful iteration of searchAfterAndBulkIndex', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: undefined,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            return {
              took: 100,
              errors: false,
              items: [
                {
                  fakeItemValue: 'fakeItemKey',
                },
              ],
            };
          }
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          return sampleDocSearchResultsWithSortId;
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        sampleDocSearchResultsWithSortId,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(10);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: sampleParams.maxSignals,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            return {
              took: 100,
              errors: false,
              items: [
                {
                  fakeItemValue: 'fakeItemKey',
                },
              ],
            };
          }
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          const toReturn = repeatedSearchResultsWithSortId(4);
          return toReturn;
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger
      );
      expect(result).toEqual(true);
    });
    test('if unsuccessful first bulk index', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      const savedObjectsClient = savedObjectsClientMock.create();
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            return {
              took: 100,
              errors: true, // will cause singleBulkIndex to return false
            };
          }
          return {}; // nothing
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkIndex due to empty sort ids', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: undefined,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            return {
              took: 100,
              errors: false,
              items: [
                {
                  fakeItemValue: 'fakeItemKey',
                },
              ],
            };
          }
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          return sampleDocSearchResultsWithSortId;
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        sampleDocSearchResultsNoSortId,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkIndex due to empty sort ids and 0 total hits', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(undefined);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: undefined,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            return {
              took: 100,
              errors: false,
              items: [
                {
                  fakeItemValue: 'fakeItemKey',
                },
              ],
            };
          }
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          return sampleDocSearchResultsWithSortId;
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        sampleDocSearchResultsNoSortIdNoHits,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs and search after returns results with no sort ids', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(10);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: sampleParams.maxSignals,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            return {
              took: 100,
              errors: false,
              items: [
                {
                  fakeItemValue: 'fakeItemKey',
                },
              ],
            };
          }
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          return sampleDocSearchResultsNoSortId;
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(result).toEqual(true);
    });
    test('if logs error when iteration is unsuccessful when bulk index results in a failure', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(5);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: sampleParams.maxSignals,
      });

      const mockService: AlertServices = {
        callCluster: jest.fn(async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            if (params.body.length > 3) {
              return {
                took: 100,
                errors: false,
                items: [
                  {
                    fakeItemValue: 'fakeItemKey',
                  },
                ],
              };
            } else {
              return {
                took: 100,
                errors: true,
                items: [
                  {
                    fakeItemValue: 'fakeItemKey',
                  },
                ],
              };
            }
          }
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          return sampleDocSearchResultsWithSortId;
        }),
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(result).toEqual(true);
    });
    test('if returns false when singleSearchAfter throws an exception', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams(10);
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
        maxDocs: sampleParams.maxSignals,
      });
      const mockService: AlertServices = {
        callCluster: async (action: string, params: SearchParams) => {
          if (action === 'bulk') {
            expect(action).toEqual('bulk');
            expect(params.index).toEqual('.siem-signals-10-01-2019');
            return {
              took: 100,
              errors: false,
              items: [
                {
                  fakeItemValue: 'fakeItemKey',
                },
              ],
            };
          }
          expect(action).toEqual('search');
          expect(params.index).toEqual(sampleParams.index);
          expect(params).toEqual(expectedSearchAfterQuery);
          throw Error('Fake Error');
        },
        alertInstanceFactory: jest.fn(),
        savedObjectsClient,
      };
      const result = await searchAfterAndBulkIndex(
        repeatedSearchResultsWithSortId(4),
        sampleParams,
        mockService,
        mockLogger
      );
      expect(result).toEqual(false);
    });
  });
});
