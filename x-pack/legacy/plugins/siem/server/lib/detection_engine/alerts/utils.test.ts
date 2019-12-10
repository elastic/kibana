/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { savedObjectsClientMock, loggingServiceMock } from 'src/core/server/mocks';

import { Logger } from '../../../../../../../../src/core/server';
import {
  buildBulkBody,
  generateId,
  singleBulkCreate,
  singleSearchAfter,
  searchAfterAndBulkCreate,
  buildEventTypeSignal,
  buildSignal,
  buildRule,
} from './utils';
import {
  sampleDocNoSortId,
  sampleRuleAlertParams,
  sampleDocSearchResultsNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
  sampleDocSearchResultsNoSortIdNoVersion,
  sampleDocSearchResultsWithSortId,
  sampleEmptyDocSearchResults,
  repeatedSearchResultsWithSortId,
  sampleBulkCreateDuplicateResult,
  sampleRuleGuid,
  sampleRule,
  sampleIdGuid,
} from './__mocks__/es_results';
import { DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';
import { OutputRuleAlertRest } from './types';
import { Signal } from '../../types';

const mockLogger: Logger = loggingServiceMock.createLogger();

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
      const sampleParams = sampleRuleAlertParams();
      const fakeSignalSourceHit = buildBulkBody({
        doc: sampleDocNoSortId(),
        ruleParams: sampleParams,
        id: sampleRuleGuid,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      // Timestamp will potentially always be different so remove it for the test
      delete fakeSignalSourceHit['@timestamp'];
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        event: {
          kind: 'signal',
        },
        signal: {
          parent: {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          original_time: 'someTimeStamp',
          status: 'open',
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
            tags: ['some fake tag 1', 'some fake tag 2'],
            type: 'query',
            to: 'now',
            enabled: true,
            created_by: 'elastic',
            updated_by: 'elastic',
          },
        },
      });
    });

    test('if bulk body builds original_event if it exists on the event to begin with', () => {
      const sampleParams = sampleRuleAlertParams();
      const doc = sampleDocNoSortId();
      doc._source.event = {
        action: 'socket_opened',
        module: 'system',
        dataset: 'socket',
        kind: 'event',
      };
      const fakeSignalSourceHit = buildBulkBody({
        doc,
        ruleParams: sampleParams,
        id: sampleRuleGuid,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      // Timestamp will potentially always be different so remove it for the test
      delete fakeSignalSourceHit['@timestamp'];
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        event: {
          action: 'socket_opened',
          dataset: 'socket',
          kind: 'signal',
          module: 'system',
        },
        signal: {
          original_event: {
            action: 'socket_opened',
            dataset: 'socket',
            kind: 'event',
            module: 'system',
          },
          parent: {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          original_time: 'someTimeStamp',
          status: 'open',
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
            tags: ['some fake tag 1', 'some fake tag 2'],
            type: 'query',
            to: 'now',
            enabled: true,
            created_by: 'elastic',
            updated_by: 'elastic',
          },
        },
      });
    });

    test('if bulk body builds original_event if it exists on the event to begin with but no kind information', () => {
      const sampleParams = sampleRuleAlertParams();
      const doc = sampleDocNoSortId();
      doc._source.event = {
        action: 'socket_opened',
        module: 'system',
        dataset: 'socket',
      };
      const fakeSignalSourceHit = buildBulkBody({
        doc,
        ruleParams: sampleParams,
        id: sampleRuleGuid,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      // Timestamp will potentially always be different so remove it for the test
      delete fakeSignalSourceHit['@timestamp'];
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        event: {
          action: 'socket_opened',
          dataset: 'socket',
          kind: 'signal',
          module: 'system',
        },
        signal: {
          original_event: {
            action: 'socket_opened',
            dataset: 'socket',
            module: 'system',
          },
          parent: {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          original_time: 'someTimeStamp',
          status: 'open',
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
            tags: ['some fake tag 1', 'some fake tag 2'],
            type: 'query',
            to: 'now',
            enabled: true,
            created_by: 'elastic',
            updated_by: 'elastic',
          },
        },
      });
    });

    test('if bulk body builds original_event if it exists on the event to begin with with only kind information', () => {
      const sampleParams = sampleRuleAlertParams();
      const doc = sampleDocNoSortId();
      doc._source.event = {
        kind: 'event',
      };
      const fakeSignalSourceHit = buildBulkBody({
        doc,
        ruleParams: sampleParams,
        id: sampleRuleGuid,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      // Timestamp will potentially always be different so remove it for the test
      delete fakeSignalSourceHit['@timestamp'];
      expect(fakeSignalSourceHit).toEqual({
        someKey: 'someValue',
        event: {
          kind: 'signal',
        },
        signal: {
          original_event: {
            kind: 'event',
          },
          parent: {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          original_time: 'someTimeStamp',
          status: 'open',
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
            tags: ['some fake tag 1', 'some fake tag 2'],
            type: 'query',
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
      const sampleParams = sampleRuleAlertParams();
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
        someResult: sampleSearchResult(),
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(successfulsingleBulkCreate).toEqual(true);
    });
    test('create successful bulk create with docs with no versioning', async () => {
      const sampleParams = sampleRuleAlertParams();
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
        someResult: sampleSearchResult(),
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(successfulsingleBulkCreate).toEqual(true);
    });
    test('create unsuccessful bulk create due to empty search results', async () => {
      const sampleParams = sampleRuleAlertParams();
      const sampleSearchResult = sampleEmptyDocSearchResults;
      mockService.callCluster.mockReturnValue(false);
      const successfulsingleBulkCreate = await singleBulkCreate({
        someResult: sampleSearchResult,
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(successfulsingleBulkCreate).toEqual(true);
    });
    test('create successful bulk create when bulk create has errors', async () => {
      const sampleParams = sampleRuleAlertParams();
      const sampleSearchResult = sampleDocSearchResultsNoSortId;
      mockService.callCluster.mockReturnValue(sampleBulkCreateDuplicateResult);
      const successfulsingleBulkCreate = await singleBulkCreate({
        someResult: sampleSearchResult(),
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(mockLogger.error).toHaveBeenCalled();
      expect(successfulsingleBulkCreate).toEqual(true);
    });
  });
  describe('singleSearchAfter', () => {
    test('if singleSearchAfter works without a given sort id', async () => {
      let searchAfterSortId;
      const sampleParams = sampleRuleAlertParams();
      mockService.callCluster.mockReturnValue(sampleDocSearchResultsNoSortId);
      await expect(
        singleSearchAfter({
          searchAfterSortId,
          ruleParams: sampleParams,
          services: mockService,
          logger: mockLogger,
          pageSize: 1,
          filter: undefined,
        })
      ).rejects.toThrow('Attempted to search after with empty sort id');
    });
    test('if singleSearchAfter works with a given sort id', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleRuleAlertParams();
      mockService.callCluster.mockReturnValue(sampleDocSearchResultsWithSortId);
      const searchAfterResult = await singleSearchAfter({
        searchAfterSortId,
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        pageSize: 1,
        filter: undefined,
      });
      expect(searchAfterResult).toEqual(sampleDocSearchResultsWithSortId);
    });
    test('if singleSearchAfter throws error', async () => {
      const searchAfterSortId = '1234567891111';
      const sampleParams = sampleRuleAlertParams();
      mockService.callCluster.mockImplementation(async () => {
        throw Error('Fake Error');
      });
      await expect(
        singleSearchAfter({
          searchAfterSortId,
          ruleParams: sampleParams,
          services: mockService,
          logger: mockLogger,
          pageSize: 1,
          filter: undefined,
        })
      ).rejects.toThrow('Fake Error');
    });
  });
  describe('searchAfterAndBulkCreate', () => {
    test('if successful with empty search results', async () => {
      const sampleParams = sampleRuleAlertParams();
      const result = await searchAfterAndBulkCreate({
        someResult: sampleEmptyDocSearchResults,
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(0);
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs', async () => {
      const sampleParams = sampleRuleAlertParams(30);
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
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(mockService.callCluster).toHaveBeenCalledTimes(5);
      expect(result).toEqual(true);
    });
    test('if unsuccessful first bulk create', async () => {
      const someGuids = Array.from({ length: 4 }).map(x => uuid.v4());
      const sampleParams = sampleRuleAlertParams(10);
      mockService.callCluster.mockReturnValue(sampleBulkCreateDuplicateResult);
      const result = await searchAfterAndBulkCreate({
        someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkCreate due to empty sort ids', async () => {
      const sampleParams = sampleRuleAlertParams();
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
        someResult: sampleDocSearchResultsNoSortId(),
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual(false);
    });
    test('if unsuccessful iteration of searchAfterAndBulkCreate due to empty sort ids and 0 total hits', async () => {
      const sampleParams = sampleRuleAlertParams();
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
        someResult: sampleDocSearchResultsNoSortIdNoHits(),
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs and search after returns results with no sort ids', async () => {
      const sampleParams = sampleRuleAlertParams(10);
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
        .mockReturnValueOnce(sampleDocSearchResultsNoSortId());
      const result = await searchAfterAndBulkCreate({
        someResult: repeatedSearchResultsWithSortId(4, 1, someGuids),
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(result).toEqual(true);
    });
    test('if successful iteration of while loop with maxDocs and search after returns empty results with no sort ids', async () => {
      const sampleParams = sampleRuleAlertParams(10);
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
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(result).toEqual(true);
    });
    test('if returns false when singleSearchAfter throws an exception', async () => {
      const sampleParams = sampleRuleAlertParams(10);
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
        ruleParams: sampleParams,
        services: mockService,
        logger: mockLogger,
        id: sampleRuleGuid,
        signalsIndex: DEFAULT_SIGNALS_INDEX,
        name: 'rule-name',
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: '5m',
        enabled: true,
        pageSize: 1,
        filter: undefined,
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      expect(result).toEqual(false);
    });
  });

  describe('buildEventTypeSignal', () => {
    test('it returns the event appended of kind signal if it does not exist', () => {
      const doc = sampleDocNoSortId();
      delete doc._source.event;
      const eventType = buildEventTypeSignal(doc);
      const expected: object = { kind: 'signal' };
      expect(eventType).toEqual(expected);
    });

    test('it returns the event appended of kind signal if it is an empty object', () => {
      const doc = sampleDocNoSortId();
      doc._source.event = {};
      const eventType = buildEventTypeSignal(doc);
      const expected: object = { kind: 'signal' };
      expect(eventType).toEqual(expected);
    });

    test('it returns the event with kind signal and other properties if they exist', () => {
      const doc = sampleDocNoSortId();
      doc._source.event = {
        action: 'socket_opened',
        module: 'system',
        dataset: 'socket',
      };
      const eventType = buildEventTypeSignal(doc);
      const expected: object = {
        action: 'socket_opened',
        module: 'system',
        dataset: 'socket',
        kind: 'signal',
      };
      expect(eventType).toEqual(expected);
    });
  });

  describe('buildSignal', () => {
    test('it builds a signal as expected without original_event if event does not exist', () => {
      const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
      delete doc._source.event;
      const rule: Partial<OutputRuleAlertRest> = sampleRule();
      const signal = buildSignal(doc, rule);
      const expected: Signal = {
        parent: {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        original_time: 'someTimeStamp',
        status: 'open',
        rule: {
          created_by: 'elastic',
          description: 'Detecting root and admin users',
          enabled: true,
          false_positives: [],
          from: 'now-6m',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          risk_score: 50,
          rule_id: 'rule-1',
          language: 'kuery',
          max_signals: 100,
          name: 'Detect Root/Admin Users',
          output_index: '.siem-signals',
          query: 'user.name: root or user.name: admin',
          references: ['http://www.example.com', 'https://ww.example.com'],
          severity: 'high',
          updated_by: 'elastic',
          tags: ['some fake tag 1', 'some fake tag 2'],
          to: 'now',
          type: 'query',
        },
      };
      expect(signal).toEqual(expected);
    });

    test('it builds a signal as expected with original_event if is present', () => {
      const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
      doc._source.event = {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'event',
        module: 'system',
      };
      const rule: Partial<OutputRuleAlertRest> = sampleRule();
      const signal = buildSignal(doc, rule);
      const expected: Signal = {
        parent: {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        original_time: 'someTimeStamp',
        original_event: {
          action: 'socket_opened',
          dataset: 'socket',
          kind: 'event',
          module: 'system',
        },
        status: 'open',
        rule: {
          created_by: 'elastic',
          description: 'Detecting root and admin users',
          enabled: true,
          false_positives: [],
          from: 'now-6m',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          risk_score: 50,
          rule_id: 'rule-1',
          language: 'kuery',
          max_signals: 100,
          name: 'Detect Root/Admin Users',
          output_index: '.siem-signals',
          query: 'user.name: root or user.name: admin',
          references: ['http://www.example.com', 'https://ww.example.com'],
          severity: 'high',
          updated_by: 'elastic',
          tags: ['some fake tag 1', 'some fake tag 2'],
          to: 'now',
          type: 'query',
        },
      };
      expect(signal).toEqual(expected);
    });
  });

  describe('buildRule', () => {
    test('it builds a rule as expected with filters present', () => {
      const ruleParams = sampleRuleAlertParams();
      ruleParams.filters = [
        {
          query: 'host.name: Rebecca',
        },
        {
          query: 'host.name: Evan',
        },
        {
          query: 'host.name: Braden',
        },
      ];
      const rule = buildRule({
        ruleParams,
        name: 'some-name',
        id: sampleRuleGuid,
        enabled: false,
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: 'some interval',
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      const expected: Partial<OutputRuleAlertRest> = {
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: false,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: 'some interval',
        language: 'kuery',
        max_signals: 10000,
        name: 'some-name',
        output_index: '.siem-signals',
        query: 'user.name: root or user.name: admin',
        references: ['http://google.com'],
        risk_score: 50,
        rule_id: 'rule-1',
        severity: 'high',
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
        updated_by: 'elastic',
        filters: [
          {
            query: 'host.name: Rebecca',
          },
          {
            query: 'host.name: Evan',
          },
          {
            query: 'host.name: Braden',
          },
        ],
      };
      expect(rule).toEqual(expected);
    });

    test('it omits a null value such as if enabled is null if is present', () => {
      const ruleParams = sampleRuleAlertParams();
      ruleParams.filters = undefined;
      const rule = buildRule({
        ruleParams,
        name: 'some-name',
        id: sampleRuleGuid,
        enabled: true,
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: 'some interval',
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      const expected: Partial<OutputRuleAlertRest> = {
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: 'some interval',
        language: 'kuery',
        max_signals: 10000,
        name: 'some-name',
        output_index: '.siem-signals',
        query: 'user.name: root or user.name: admin',
        references: ['http://google.com'],
        risk_score: 50,
        rule_id: 'rule-1',
        severity: 'high',
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
        updated_by: 'elastic',
      };
      expect(rule).toEqual(expected);
    });

    test('it omits a null value such as if filters is undefined if is present', () => {
      const ruleParams = sampleRuleAlertParams();
      ruleParams.filters = undefined;
      const rule = buildRule({
        ruleParams,
        name: 'some-name',
        id: sampleRuleGuid,
        enabled: true,
        createdBy: 'elastic',
        updatedBy: 'elastic',
        interval: 'some interval',
        tags: ['some fake tag 1', 'some fake tag 2'],
      });
      const expected: Partial<OutputRuleAlertRest> = {
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: 'some interval',
        language: 'kuery',
        max_signals: 10000,
        name: 'some-name',
        output_index: '.siem-signals',
        query: 'user.name: root or user.name: admin',
        references: ['http://google.com'],
        risk_score: 50,
        rule_id: 'rule-1',
        severity: 'high',
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
        updated_by: 'elastic',
      };
      expect(rule).toEqual(expected);
    });
  });
});
