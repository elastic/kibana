/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { LanguageServerStatus } from '../common/language_server';
import { RepositoryReservedField } from './indexer/schema';
import { EsClient } from './lib/esqueue';
import { LspService } from './lsp/lsp_service';
import { emptyAsyncFunc } from './test_utils';
import * as usageCollector from './usage_collector';

const esClient = {
  search: emptyAsyncFunc,
};

const lspService = {
  languageServerStatus: emptyAsyncFunc,
};

const createSearchSpy = (): sinon.SinonSpy => {
  return sinon.fake.returns(
    Promise.resolve({
      hits: {
        hits: [
          {
            _source: {
              [RepositoryReservedField]: {
                uri: 'github.com/elastic/code1',
              },
            },
          },
          {
            _source: {
              [RepositoryReservedField]: {
                uri: 'github.com/elastic/code2',
              },
            },
          },
        ],
      },
    })
  );
};

describe('Code Usage Collector', () => {
  let makeUsageCollectorStub: any;
  let registerStub: any;
  let serverStub: any;
  let callClusterStub: any;
  let languageServerStatusStub: any;
  let searchStub: any;

  beforeEach(() => {
    makeUsageCollectorStub = sinon.spy();
    registerStub = sinon.stub();
    serverStub = {
      usage: {
        collectorSet: { makeUsageCollector: makeUsageCollectorStub, register: registerStub },
        register: {},
      },
    };
    callClusterStub = sinon.stub();

    searchStub = createSearchSpy();
    esClient.search = searchStub;

    languageServerStatusStub = sinon.stub();
    languageServerStatusStub.withArgs('TypeScript').returns(LanguageServerStatus.READY);
    languageServerStatusStub.withArgs('Java').returns(LanguageServerStatus.READY);
    languageServerStatusStub.withArgs('Ctags').returns(LanguageServerStatus.READY);
    languageServerStatusStub.withArgs('Go').returns(LanguageServerStatus.NOT_INSTALLED);
    lspService.languageServerStatus = languageServerStatusStub;
  });

  describe('initCodeUsageCollector', () => {
    it('should call collectorSet.register', () => {
      usageCollector.initCodeUsageCollector(
        serverStub,
        esClient as EsClient,
        (lspService as any) as LspService
      );
      expect(registerStub.calledOnce).toBeTruthy();
    });

    it('should call makeUsageCollector with type = code', () => {
      usageCollector.initCodeUsageCollector(
        serverStub,
        esClient as EsClient,
        (lspService as any) as LspService
      );
      expect(makeUsageCollectorStub.calledOnce).toBeTruthy();
      expect(makeUsageCollectorStub.getCall(0).args[0].type).toBe('code');
    });

    it('should return correct stats', async () => {
      usageCollector.initCodeUsageCollector(
        serverStub,
        esClient as EsClient,
        (lspService as any) as LspService
      );
      const codeStats = await makeUsageCollectorStub.getCall(0).args[0].fetch(callClusterStub);
      expect(callClusterStub.notCalled).toBeTruthy();
      expect(codeStats).toEqual({
        enabled: 1,
        repositories: 2,
        langserver: [
          {
            enabled: 1,
            key: 'TypeScript',
          },
          {
            enabled: 1,
            key: 'Java',
          },
          {
            enabled: 0,
            key: 'Go',
          },
        ],
      });
    });
  });
});
