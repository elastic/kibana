/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { savedObjectsClientMock } from 'src/core/server/mocks';

import { Logger } from '../../../../../../../../src/core/server';
import {
  buildBulkBody,
  generateId,
  singleBulkCreate,
  singleSearchAfter,
  searchAfterAndBulkCreate,
} from './utils';
import {
  sampleDocNoSortId,
  sampleSignalAlertParams,
  sampleDocSearchResultsNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
  sampleDocSearchResultsNoSortIdNoVersion,
  sampleDocSearchResultsWithSortId,
  sampleEmptyDocSearchResults,
  repeatedSearchResultsWithSortId,
  sampleBulkCreateDuplicateResult,
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
      const fakeUuid = uuid.v4();
      const sampleParams = sampleSignalAlertParams(undefined);
      const fakeSignalSourceHit = buildBulkBody({
        doc: sampleDocNoSortId(fakeUuid),
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
      if (fakeSignalSourceHit.signal.parent) {
        delete fakeSignalSourceHit.signal.parent.id;
      }
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        signal: {
          parent: {
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
  describe('singleBulkCreate', () => {
    describe('create signal id gereateId', () => {
      test('two docs with same index, id, and version should have same id', () => {
        const findex = 'myfakeindex';
        const fid = 'somefakeid';
        const version = '1';
        // 'myfakeindexsomefakeid1'
        const generatedHash = '91309a297453bae2d02bf116e9c401be502254253f9add4a90f718fd4db7fa0b';
        const firstHash = generateId(findex, fid, version);
        const secondHash = generateId(findex, fid, version);
        expect(firstHash).toEqual(generatedHash);
        expect(secondHash).toEqual(generatedHash);
      });
      test('two docs with different index, id, and version should have different id', () => {
        const findex = 'myfakeindex';
        const findex2 = 'mysecondfakeindex';
        const fid = 'somefakeid';
        const version = '1';
        // 'myfakeindexsomefakeid1'
        const firstGeneratedHash =
          '91309a297453bae2d02bf116e9c401be502254253f9add4a90f718fd4db7fa0b';
        // 'mysecondfakeindexsomefakeid1'
        const secondGeneratedHash =
          '6f0968c02efd606b94bfc6dc3f3fc57aa4bc3cbbab569b7ad51e090a7e4b8040';
        const firstHash = generateId(findex, fid, version);
        const secondHash = generateId(findex2, fid, version);
        expect(firstHash).toEqual(firstGeneratedHash);
        expect(secondHash).toEqual(secondGeneratedHash);
        expect(firstHash).not.toEqual(secondHash);
      });
      test('two docs with same index, different id, and same version should have different id', () => {
        const findex = 'myfakeindex';
        const fid = 'somefakeid';
        const fid2 = 'somefakeid2';
        const version = '1';
        // 'myfakeindexsomefakeid1'
        const firstGeneratedHash =
          '91309a297453bae2d02bf116e9c401be502254253f9add4a90f718fd4db7fa0b';
        // 'myfakeindexsomefakeid21'
        const secondGeneratedHash =
          '09dbae1c0dd2673daa17069723eadd3440ab0ac111e48b0ca079b2508525fb49';
        const firstHash = generateId(findex, fid, version);
        const secondHash = generateId(findex, fid2, version);
        expect(firstHash).toEqual(firstGeneratedHash);
        expect(secondHash).toEqual(secondGeneratedHash);
        expect(firstHash).not.toEqual(secondHash);
      });
      test('two docs with same index, same id, and different version should have different id', () => {
        const findex = 'myfakeindex';
        const fid = 'somefakeid';
        const version = '1';
        const version2 = '2';
        // 'myfakeindexsomefakeid1'
        const firstGeneratedHash =
          '91309a297453bae2d02bf116e9c401be502254253f9add4a90f718fd4db7fa0b';
        // myfakeindexsomefakeid2'
        const secondGeneratedHash =
          '4ff04fb2bffe36ec96b2f673f199292701df0faeb685d5a1c8b88ba54711b7bd';
        const firstHash = generateId(findex, fid, version);
        const secondHash = generateId(findex, fid, version2);
        expect(firstHash).toEqual(firstGeneratedHash);
        expect(secondHash).toEqual(secondGeneratedHash);
        expect(firstHash).not.toEqual(secondHash);
      });
    });
    test('create successful bulk create', async () => {
      const fakeUuid = uuid.v4();
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
      const successfulsingleBulkCreate = await singleBulkCreate({
        someResult: sampleSearchResult(fakeUuid),
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
      expect(successfulsingleBulkCreate).toEqual(true);
    });
    test('create successful bulk create with docs with no versioning', async () => {
      const fakeUuid = uuid.v4();
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleDocSearchResultsNoSortIdNoVersion;
      mockService.callCluster.mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      });
      const successfulsingleBulkCreate = await singleBulkCreate({
        someResult: sampleSearchResult(fakeUuid),
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
      expect(successfulsingleBulkCreate).toEqual(true);
    });
    test('create unsuccessful bulk create due to empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleEmptyDocSearchResults;
      mockService.callCluster.mockReturnValue(false);
      const successfulsingleBulkCreate = await singleBulkCreate({
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
      expect(successfulsingleBulkCreate).toEqual(true);
    });
    test('create successful bulk create when bulk create has errors', async () => {
      const fakeUuid = uuid.v4();
      const sampleParams = sampleSignalAlertParams(undefined);
      const sampleSearchResult = sampleDocSearchResultsNoSortId;
      mockService.callCluster.mockReturnValue(sampleBulkCreateDuplicateResult);
      const successfulsingleBulkCreate = await singleBulkCreate({
        someResult: sampleSearchResult(fakeUuid),
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
      expect(successfulsingleBulkCreate).toEqual(true);
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
          pageSize: 1,
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
        pageSize: 1,
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
          pageSize: 1,
        })
      ).rejects.toThrow('Fake Error');
    });
  });
  describe('searchAfterAndBulkCreate', () => {
    test('if successful with empty search results', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const result = await searchAfterAndBulkCreate({
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
        pageSize: 1,
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(0);
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs', async () => {
      const sampleParams = sampleSignalAlertParams(30);
      const someGuids = Array.from({ length: 13 }).map(x => uuid.v4());
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
        .mockReturnValueOnce(repeatedSearchResultsWithSortId(3, 1, someGuids.splice(0, 3)))
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        })
        .mockReturnValueOnce(repeatedSearchResultsWithSortId(3, 1, someGuids.splice(3, 6)))
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        });
      const result = await searchAfterAndBulkCreate({
        someResult: repeatedSearchResultsWithSortId(3, 1, someGuids.splice(6, 9)),
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
        pageSize: 1,
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(5);
      expect(result).toEqual(true);
    });
    test('if unsuccessful first bulk create', async () => {
      const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
      const sampleParams = sampleSignalAlertParams(10);
      mockService.callCluster.mockReturnValue(sampleBulkCreateDuplicateResult);
      const result = await searchAfterAndBulkCreate({
        someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
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
        pageSize: 1,
      });
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkCreate due to empty sort ids', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const someUuid = uuid.v4();
      mockService.callCluster.mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      });
      const result = await searchAfterAndBulkCreate({
        someResult: sampleDocSearchResultsNoSortId(someUuid),
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
        pageSize: 1,
      });
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkCreate due to empty sort ids and 0 total hits', async () => {
      const sampleParams = sampleSignalAlertParams(undefined);
      const someUuid = uuid.v4();
      mockService.callCluster.mockReturnValueOnce({
        took: 100,
        errors: false,
        items: [
          {
            fakeItemValue: 'fakeItemKey',
          },
        ],
      });
      const result = await searchAfterAndBulkCreate({
        someResult: sampleDocSearchResultsNoSortIdNoHits(someUuid),
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
        pageSize: 1,
      });
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs and search after returns results with no sort ids', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      const oneGuid = uuid.v4();
      const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
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
        .mockReturnValueOnce(sampleDocSearchResultsNoSortId(oneGuid));
      const result = await searchAfterAndBulkCreate({
        someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
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
        pageSize: 1,
      });
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs and search after returns empty results with no sort ids', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
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
      const result = await searchAfterAndBulkCreate({
        someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
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
        pageSize: 1,
      });
      expect(result).toEqual(true);
    });
    test('if returns false when singleSearchAfter throws an exception', async () => {
      const sampleParams = sampleSignalAlertParams(10);
      const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
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
        .mockImplementation(() => {
          throw Error('Fake Error');
        });
      const result = await searchAfterAndBulkCreate({
        someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
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
        pageSize: 1,
      });
      expect(result).toEqual(false);
    });
  });
});
