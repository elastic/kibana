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
        const ruleId = 'rule-1';
        // 'myfakeindexsomefakeid1rule-1'
        const generatedHash = '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
        const firstHash = generateId(findex, fid, version, ruleId);
        const secondHash = generateId(findex, fid, version, ruleId);
        expect(firstHash).toEqual(generatedHash);
        expect(secondHash).toEqual(generatedHash);
        expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
        expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
      });
      test('two docs with different index, id, and version should have different id', () => {
        const findex = 'myfakeindex';
        const findex2 = 'mysecondfakeindex';
        const fid = 'somefakeid';
        const version = '1';
        const ruleId = 'rule-1';
        // 'myfakeindexsomefakeid1rule-1'
        const firstGeneratedHash =
          '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
        // 'mysecondfakeindexsomefakeid1rule-1'
        const secondGeneratedHash =
          'a852941273f805ffe9006e574601acc8ae1148d6c0b3f7f8c4785cba8f6b768a';
        const firstHash = generateId(findex, fid, version, ruleId);
        const secondHash = generateId(findex2, fid, version, ruleId);
        expect(firstHash).toEqual(firstGeneratedHash);
        expect(secondHash).toEqual(secondGeneratedHash);
        expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
        expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
        expect(firstHash).not.toEqual(secondHash);
      });
      test('two docs with same index, different id, and same version should have different id', () => {
        const findex = 'myfakeindex';
        const fid = 'somefakeid';
        const fid2 = 'somefakeid2';
        const version = '1';
        const ruleId = 'rule-1';
        // 'myfakeindexsomefakeid1rule-1'
        const firstGeneratedHash =
          '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
        // 'myfakeindexsomefakeid21rule-1'
        const secondGeneratedHash =
          '7d33faea18159fd010c4b79890620e8b12cdc88ec1d370149d0e5552ce860255';
        const firstHash = generateId(findex, fid, version, ruleId);
        const secondHash = generateId(findex, fid2, version, ruleId);
        expect(firstHash).toEqual(firstGeneratedHash);
        expect(secondHash).toEqual(secondGeneratedHash);
        expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
        expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
        expect(firstHash).not.toEqual(secondHash);
      });
      test('two docs with same index, same id, and different version should have different id', () => {
        const findex = 'myfakeindex';
        const fid = 'somefakeid';
        const version = '1';
        const version2 = '2';
        const ruleId = 'rule-1';
        // 'myfakeindexsomefakeid1rule-1'
        const firstGeneratedHash =
          '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
        // myfakeindexsomefakeid2rule-1'
        const secondGeneratedHash =
          'f016f3071fa9df9221d2fb2ba92389d4d388a4347c6ec7a4012c01cb1c640a40';
        const firstHash = generateId(findex, fid, version, ruleId);
        const secondHash = generateId(findex, fid, version2, ruleId);
        expect(firstHash).toEqual(firstGeneratedHash);
        expect(secondHash).toEqual(secondGeneratedHash);
        expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
        expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
        expect(firstHash).not.toEqual(secondHash);
      });
      test('Ensure generated id is less than 512 bytes, even for really really long strings', () => {
        const longIndexName =
          'myfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindex';
        const fid = 'somefakeid';
        const version = '1';
        const ruleId = 'rule-1';
        const firstHash = generateId(longIndexName, fid, version, ruleId);
        expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
      });
      test('two docs with same index, same id, same version number, and different rule ids should have different id', () => {
        const findex = 'myfakeindex';
        const fid = 'somefakeid';
        const version = '1';
        const ruleId = 'rule-1';
        const ruleId2 = 'rule-2';
        // 'myfakeindexsomefakeid1rule-1'
        const firstGeneratedHash =
          '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
        // myfakeindexsomefakeid1rule-2'
        const secondGeneratedHash =
          '1eb04f997086f8b3b143d4d9b18ac178c4a7423f71a5dad9ba8b9e92603c6863';
        const firstHash = generateId(findex, fid, version, ruleId);
        const secondHash = generateId(findex, fid, version, ruleId2);
        expect(firstHash).toEqual(firstGeneratedHash);
        expect(secondHash).toEqual(secondGeneratedHash);
        expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
        expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
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
        .mockReturnValueOnce(repeatedSearchResultsWithSortId(3, 1, someGuids.slice(0, 3)))
        .mockReturnValueOnce({
          took: 100,
          errors: false,
          items: [
            {
              fakeItemValue: 'fakeItemKey',
            },
          ],
        })
        .mockReturnValueOnce(repeatedSearchResultsWithSortId(3, 1, someGuids.slice(3, 6)))
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
        someResult: repeatedSearchResultsWithSortId(3, 1, someGuids.slice(6, 9)),
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
