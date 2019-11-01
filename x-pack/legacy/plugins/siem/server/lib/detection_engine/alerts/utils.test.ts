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
  sampleDocSearchResultsWithSortId,
} from './__mocks__/es_results';
import { SignalAlertParams } from './types';
import { buildEventsSearchQuery } from './build_events_query';

describe('utils', () => {
  describe('buildBulkBody', () => {
    test('if bulk body builds well-defined body', () => {
      const sampleParams: SignalAlertParams = sampleSignalAlertParams();
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
      // need a sample search result, sample signal params, mock service, mock logger
      const sampleParams = sampleSignalAlertParams();
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
      const mockLogger: Logger = {
        info: jest.fn((logString: string) => {
          return logString;
        }),
        warn: jest.fn((logString: string) => {
          return logString;
        }),
        trace: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        log: jest.fn(),
      };
      const successfulSingleBulkIndex = await singleBulkIndex(
        sampleSearchResult,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledTimes(0);
      expect(successfulSingleBulkIndex).toEqual(true);
    });
  });
  describe('singleSearchAfter', () => {
    test('if singleSearchAfter works without a given sort id', async () => {
      let searchAfterSortId;
      const sampleParams = sampleSignalAlertParams();
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
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
      const mockLogger: Logger = {
        info: jest.fn((logString: string) => {
          return logString;
        }),
        warn: jest.fn((logString: string) => {
          return logString;
        }),
        trace: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        log: jest.fn(),
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
      const sampleParams = sampleSignalAlertParams();
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
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
      const mockLogger: Logger = {
        info: jest.fn((logString: string) => {
          return logString;
        }),
        warn: jest.fn((logString: string) => {
          return logString;
        }),
        trace: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        log: jest.fn(),
      };
      const searchAfterResult = await singleSearchAfter(
        searchAfterSortId,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(searchAfterResult).toEqual(sampleDocSearchResultsWithSortId);
    });
  });
  describe('searchAfterAndBulkIndex', () => {
    test('if one successful iteration of searchAfterAndBulkIndex', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleSignalAlertParams();
      const savedObjectsClient = savedObjectsClientMock.create();
      const expectedSearchAfterQuery = buildEventsSearchQuery({
        index: sampleParams.index,
        from: sampleParams.from,
        to: sampleParams.to,
        filter: sampleParams.filter,
        size: sampleParams.size ? sampleParams.size : 1,
        searchAfterSortId,
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
      const mockLogger: Logger = {
        info: jest.fn((logString: string) => {
          return logString;
        }),
        warn: jest.fn((logString: string) => {
          expect(logString).toEqual('something');
          return logString;
        }),
        trace: jest.fn(),
        debug: jest.fn(),
        error: jest.fn((logString: string) => {
          expect(logString).toEqual('something');
          return logString;
        }),
        fatal: jest.fn(),
        log: jest.fn(),
      };
      const result = await searchAfterAndBulkIndex(
        sampleDocSearchResultsWithSortId,
        sampleParams,
        mockService,
        mockLogger
      );
      expect(result).toEqual(true);
    });
  });
});
