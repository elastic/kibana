/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Puid from 'puid';
import sinon from 'sinon';
import nodeCrypto from '@elastic/node-crypto';
import { CancellationToken } from '../../../common/cancellation_token';
import { fieldFormats } from '../../../../../../../src/plugins/data/server';
import { createMockReportingCore } from '../../../test_helpers';
import { LevelLogger } from '../../../server/lib/level_logger';
import { executeJobFactory } from './execute_job';
import { setFieldFormats } from '../../../server/services';

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

const puid = new Puid();
const getRandomScrollId = () => {
  return puid.generate();
};

describe('CSV Execute Job', function() {
  const encryptionKey = 'testEncryptionKey';
  const headers = {
    sid: 'test',
  };
  const mockLogger = new LevelLogger({
    get: () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  });
  let defaultElasticsearchResponse;
  let encryptedHeaders;

  let cancellationToken;
  let mockReportingPlugin;
  let mockServer;
  let clusterStub;
  let callAsCurrentUserStub;

  const mockElasticsearch = {
    dataClient: {
      asScoped: () => clusterStub,
    },
  };
  const mockUiSettingsClient = {
    get: sinon.stub(),
  };

  beforeAll(async function() {
    const crypto = nodeCrypto({ encryptionKey });
    encryptedHeaders = await crypto.encrypt(headers);
  });

  beforeEach(async function() {
    mockReportingPlugin = await createMockReportingCore();
    mockReportingPlugin.getUiSettingsServiceFactory = () => mockUiSettingsClient;
    cancellationToken = new CancellationToken();

    defaultElasticsearchResponse = {
      hits: {
        hits: [],
      },
      _scroll_id: 'defaultScrollId',
    };
    clusterStub = {
      callAsCurrentUser: function() {},
    };

    callAsCurrentUserStub = sinon
      .stub(clusterStub, 'callAsCurrentUser')
      .resolves(defaultElasticsearchResponse);

    const configGetStub = sinon.stub();
    mockUiSettingsClient.get.withArgs('csv:separator').returns(',');
    mockUiSettingsClient.get.withArgs('csv:quoteValues').returns(true);

    setFieldFormats({
      fieldFormatServiceFactory: function() {
        const uiConfigMock = {};
        uiConfigMock['format:defaultTypeMap'] = {
          _default_: { id: 'string', params: {} },
        };

        const fieldFormatsRegistry = new fieldFormats.FieldFormatsRegistry();

        fieldFormatsRegistry.init(key => uiConfigMock[key], {}, [fieldFormats.StringFormat]);

        return fieldFormatsRegistry;
      },
    });

    mockServer = {
      config: function() {
        return {
          get: configGetStub,
        };
      },
    };
    mockServer
      .config()
      .get.withArgs('xpack.reporting.encryptionKey')
      .returns(encryptionKey);
    mockServer
      .config()
      .get.withArgs('xpack.reporting.csv.maxSizeBytes')
      .returns(1024 * 1000); // 1mB
    mockServer
      .config()
      .get.withArgs('xpack.reporting.csv.scroll')
      .returns({});
  });

  describe('basic Elasticsearch call behavior', function() {
    it('should decrypt encrypted headers and pass to callAsCurrentUser', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      await executeJob(
        'job456',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );
      expect(callAsCurrentUserStub.called).toBe(true);
      expect(callAsCurrentUserStub.firstCall.args[0]).toEqual('search');
    });

    it('should pass the index and body to execute the initial search', async function() {
      const index = 'index';
      const body = {
        testBody: true,
      };

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const job = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: {
          index,
          body,
        },
      };

      await executeJob('job777', job, cancellationToken);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');
      expect(searchCall.args[1].index).toBe(index);
      expect(searchCall.args[1].body).toBe(body);
    });

    it('should pass the scrollId from the initial search to the subsequent scroll', async function() {
      const scrollId = getRandomScrollId();
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: scrollId,
      });
      callAsCurrentUserStub.onSecondCall().resolves(defaultElasticsearchResponse);
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      await executeJob(
        'job456',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );

      const scrollCall = callAsCurrentUserStub.secondCall;

      expect(scrollCall.args[0]).toBe('scroll');
      expect(scrollCall.args[1].scrollId).toBe(scrollId);
    });

    it('should not execute scroll if there are no hits from the search', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      await executeJob(
        'job456',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );

      expect(callAsCurrentUserStub.callCount).toBe(2);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');

      const clearScrollCall = callAsCurrentUserStub.secondCall;
      expect(clearScrollCall.args[0]).toBe('clearScroll');
    });

    it('should stop executing scroll if there are no hits', async function() {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });
      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      await executeJob(
        'job456',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );

      expect(callAsCurrentUserStub.callCount).toBe(3);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');

      const scrollCall = callAsCurrentUserStub.secondCall;
      expect(scrollCall.args[0]).toBe('scroll');

      const clearScroll = callAsCurrentUserStub.thirdCall;
      expect(clearScroll.args[0]).toBe('clearScroll');
    });

    it('should call clearScroll with scrollId when there are no more hits', async function() {
      const lastScrollId = getRandomScrollId();
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [],
        },
        _scroll_id: lastScrollId,
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      await executeJob(
        'job456',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );

      const lastCall = callAsCurrentUserStub.getCall(callAsCurrentUserStub.callCount - 1);
      expect(lastCall.args[0]).toBe('clearScroll');
      expect(lastCall.args[1].scrollId).toEqual([lastScrollId]);
    });

    it('calls clearScroll when there is an error iterating the hits', async function() {
      const lastScrollId = getRandomScrollId();
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [
            {
              _source: {
                one: 'foo',
                two: 'bar',
              },
            },
          ],
        },
        _scroll_id: lastScrollId,
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: undefined,
        searchRequest: { index: null, body: null },
      };
      await expect(
        executeJob('job123', jobParams, cancellationToken)
      ).rejects.toMatchInlineSnapshot(`[TypeError: Cannot read property 'indexOf' of undefined]`);

      const lastCall = callAsCurrentUserStub.getCall(callAsCurrentUserStub.callCount - 1);
      expect(lastCall.args[0]).toBe('clearScroll');
      expect(lastCall.args[1].scrollId).toEqual([lastScrollId]);
    });
  });

  describe('Cells with formula values', () => {
    it('returns `csv_contains_formulas` when cells contain formulas', async function() {
      mockServer
        .config()
        .get.withArgs('xpack.reporting.csv.checkForFormulas')
        .returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: '=SUM(A1:A2)', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(true);
    });

    it('returns warnings when headings contain formulas', async function() {
      mockServer
        .config()
        .get.withArgs('xpack.reporting.csv.checkForFormulas')
        .returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { '=SUM(A1:A2)': 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['=SUM(A1:A2)', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(true);
    });

    it('returns no warnings when cells have no formulas', async function() {
      mockServer
        .config()
        .get.withArgs('xpack.reporting.csv.checkForFormulas')
        .returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(false);
    });

    it('returns no warnings when configured not to', async () => {
      mockServer
        .config()
        .get.withArgs('xpack.reporting.csv.checkForFormulas')
        .returns(false);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: '=SUM(A1:A2)', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(false);
    });
  });

  describe('Elasticsearch call errors', function() {
    it('should reject Promise if search call errors out', async function() {
      callAsCurrentUserStub.rejects(new Error());
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      };
      await expect(
        executeJob('job123', jobParams, cancellationToken)
      ).rejects.toMatchInlineSnapshot(`[Error]`);
    });

    it('should reject Promise if scroll call errors out', async function() {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });
      callAsCurrentUserStub.onSecondCall().rejects(new Error());
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      };
      await expect(
        executeJob('job123', jobParams, cancellationToken)
      ).rejects.toMatchInlineSnapshot(`[Error]`);
    });
  });

  describe('invalid responses', function() {
    it('should reject Promise if search returns hits but no _scroll_id', async function() {
      callAsCurrentUserStub.resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: undefined,
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      };
      await expect(
        executeJob('job123', jobParams, cancellationToken)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[{}]}}]`
      );
    });

    it('should reject Promise if search returns no hits and no _scroll_id', async function() {
      callAsCurrentUserStub.resolves({
        hits: {
          hits: [],
        },
        _scroll_id: undefined,
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      };
      await expect(
        executeJob('job123', jobParams, cancellationToken)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[]}}]`
      );
    });

    it('should reject Promise if scroll returns hits but no _scroll_id', async function() {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: undefined,
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      };
      await expect(
        executeJob('job123', jobParams, cancellationToken)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[{}]}}]`
      );
    });

    it('should reject Promise if scroll returns no hits and no _scroll_id', async function() {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [],
        },
        _scroll_id: undefined,
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      };
      await expect(
        executeJob('job123', jobParams, cancellationToken)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[]}}]`
      );
    });
  });

  describe('cancellation', function() {
    const scrollId = getRandomScrollId();

    beforeEach(function() {
      // We have to "re-stub" the callAsCurrentUser stub here so that we can use the fakeFunction
      // that delays the Promise resolution so we have a chance to call cancellationToken.cancel().
      // Otherwise, we get into an endless loop, and don't have a chance to call cancel
      callAsCurrentUserStub.restore();
      callAsCurrentUserStub = sinon
        .stub(clusterStub, 'callAsCurrentUser')
        .callsFake(async function() {
          await delay(1);
          return {
            hits: {
              hits: [{}],
            },
            _scroll_id: scrollId,
          };
        });
    });

    it('should stop calling Elasticsearch when cancellationToken.cancel is called', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      executeJob(
        'job345',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );

      await delay(250);
      const callCount = callAsCurrentUserStub.callCount;
      cancellationToken.cancel();
      await delay(250);
      expect(callAsCurrentUserStub.callCount).toBe(callCount + 1); // last call is to clear the scroll
    });

    it(`shouldn't call clearScroll if it never got a scrollId`, async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      executeJob(
        'job345',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );
      cancellationToken.cancel();

      for (let i = 0; i < callAsCurrentUserStub.callCount; ++i) {
        expect(callAsCurrentUserStub.getCall(i).args[1]).to.not.be('clearScroll');
      }
    });

    it('should call clearScroll if it got a scrollId', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      executeJob(
        'job345',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } },
        cancellationToken
      );
      await delay(100);
      cancellationToken.cancel();
      await delay(100);

      const lastCall = callAsCurrentUserStub.getCall(callAsCurrentUserStub.callCount - 1);
      expect(lastCall.args[0]).toBe('clearScroll');
      expect(lastCall.args[1].scrollId).toEqual([scrollId]);
    });
  });

  describe('csv content', function() {
    it('should write column headers to output, even if there are no results', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).toBe(`one,two\n`);
    });

    it('should use custom uiSettings csv:separator for header', async function() {
      mockUiSettingsClient.get.withArgs('csv:separator').returns(';');
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).toBe(`one;two\n`);
    });

    it('should escape column headers if uiSettings csv:quoteValues is true', async function() {
      mockUiSettingsClient.get.withArgs('csv:quoteValues').returns(true);
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one and a half', 'two', 'three-and-four', 'five & six'],
        searchRequest: { index: null, body: null },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).toBe(`"one and a half",two,"three-and-four","five & six"\n`);
    });

    it(`shouldn't escape column headers if uiSettings csv:quoteValues is false`, async function() {
      mockUiSettingsClient.get.withArgs('csv:quoteValues').returns(false);
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one and a half', 'two', 'three-and-four', 'five & six'],
        searchRequest: { index: null, body: null },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).toBe(`one and a half,two,three-and-four,five & six\n`);
    });

    it('should write column headers to output, when there are results', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ one: '1', two: '2' }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');
      const headerLine = lines[0];
      expect(headerLine).toBe('one,two');
    });

    it('should use comma separated values of non-nested fields from _source', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');
      const valuesLine = lines[1];
      expect(valuesLine).toBe('foo,bar');
    });

    it('should concatenate the hits from multiple responses', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });
      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [{ _source: { one: 'baz', two: 'qux' } }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');

      expect(lines[1]).toBe('foo,bar');
      expect(lines[2]).toBe('baz,qux');
    });

    it('should use field formatters to format fields', async function() {
      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
        indexPatternSavedObject: {
          id: 'logstash-*',
          type: 'index-pattern',
          attributes: {
            title: 'logstash-*',
            fields: '[{"name":"one","type":"string"}, {"name":"two","type":"string"}]',
            fieldFormatMap: '{"one":{"id":"string","params":{"transform": "upper"}}}',
          },
        },
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');

      expect(lines[1]).toBe('FOO,bar');
    });
  });

  describe('maxSizeBytes', function() {
    // The following tests use explicitly specified lengths. UTF-8 uses between one and four 8-bit bytes for each
    // code-point. However, any character that can be represented by ASCII requires one-byte, so a majority of the
    // tests use these 'simple' characters to make the math easier

    describe('when only the headers exceed the maxSizeBytes', function() {
      let content;
      let maxSizeReached;

      beforeEach(async function() {
        mockServer
          .config()
          .get.withArgs('xpack.reporting.csv.maxSizeBytes')
          .returns(1);

        const executeJob = await executeJobFactory(
          mockReportingPlugin,
          mockServer,
          mockElasticsearch,
          mockLogger
        );
        const jobParams = {
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          searchRequest: { index: null, body: null },
        };

        ({ content, max_size_reached: maxSizeReached } = await executeJob(
          'job123',
          jobParams,
          cancellationToken
        ));
      });

      it('should return max_size_reached', function() {
        expect(maxSizeReached).toBe(true);
      });

      it('should return empty content', function() {
        expect(content).toBe('');
      });
    });

    describe('when headers are equal to maxSizeBytes', function() {
      let content;
      let maxSizeReached;

      beforeEach(async function() {
        mockServer
          .config()
          .get.withArgs('xpack.reporting.csv.maxSizeBytes')
          .returns(9);

        const executeJob = await executeJobFactory(
          mockReportingPlugin,
          mockServer,
          mockElasticsearch,
          mockLogger
        );
        const jobParams = {
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          searchRequest: { index: null, body: null },
        };

        ({ content, max_size_reached: maxSizeReached } = await executeJob(
          'job123',
          jobParams,
          cancellationToken
        ));
      });

      it(`shouldn't return max_size_reached`, function() {
        expect(maxSizeReached).toBe(false);
      });

      it(`should return content`, function() {
        expect(content).toBe('one,two\n');
      });
    });

    describe('when the data exceeds the maxSizeBytes', function() {
      let content;
      let maxSizeReached;

      beforeEach(async function() {
        mockServer
          .config()
          .get.withArgs('xpack.reporting.csv.maxSizeBytes')
          .returns(9);

        callAsCurrentUserStub.onFirstCall().returns({
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        });

        const executeJob = await executeJobFactory(
          mockReportingPlugin,
          mockServer,
          mockElasticsearch,
          mockLogger
        );
        const jobParams = {
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        };

        ({ content, max_size_reached: maxSizeReached } = await executeJob(
          'job123',
          jobParams,
          cancellationToken
        ));
      });

      it(`should return max_size_reached`, function() {
        expect(maxSizeReached).toBe(true);
      });

      it(`should return the headers in the content`, function() {
        expect(content).toBe('one,two\n');
      });
    });

    describe('when headers and data equal the maxSizeBytes', function() {
      let content;
      let maxSizeReached;

      beforeEach(async function() {
        mockReportingPlugin.getUiSettingsServiceFactory = () => mockUiSettingsClient;
        mockServer
          .config()
          .get.withArgs('xpack.reporting.csv.maxSizeBytes')
          .returns(18);

        callAsCurrentUserStub.onFirstCall().returns({
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        });

        const executeJob = await executeJobFactory(
          mockReportingPlugin,
          mockServer,
          mockElasticsearch,
          mockLogger
        );
        const jobParams = {
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        };

        ({ content, max_size_reached: maxSizeReached } = await executeJob(
          'job123',
          jobParams,
          cancellationToken
        ));
      });

      it(`shouldn't return max_size_reached`, async function() {
        expect(maxSizeReached).toBe(false);
      });

      it('should return headers and data in content', function() {
        expect(content).toBe('one,two\nfoo,bar\n');
      });
    });
  });

  describe('scroll settings', function() {
    it('passes scroll duration to initial search call', async function() {
      const scrollDuration = 'test';
      mockServer
        .config()
        .get.withArgs('xpack.reporting.csv.scroll')
        .returns({ duration: scrollDuration });

      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };

      await executeJob('job123', jobParams, cancellationToken);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');
      expect(searchCall.args[1].scroll).toBe(scrollDuration);
    });

    it('passes scroll size to initial search call', async function() {
      const scrollSize = 100;
      mockServer
        .config()
        .get.withArgs('xpack.reporting.csv.scroll')
        .returns({ size: scrollSize });

      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };

      await executeJob('job123', jobParams, cancellationToken);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');
      expect(searchCall.args[1].size).toBe(scrollSize);
    });

    it('passes scroll duration to subsequent scroll call', async function() {
      const scrollDuration = 'test';
      mockServer
        .config()
        .get.withArgs('xpack.reporting.csv.scroll')
        .returns({ duration: scrollDuration });

      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      const executeJob = await executeJobFactory(
        mockReportingPlugin,
        mockServer,
        mockElasticsearch,
        mockLogger
      );
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };

      await executeJob('job123', jobParams, cancellationToken);

      const scrollCall = callAsCurrentUserStub.secondCall;
      expect(scrollCall.args[0]).toBe('scroll');
      expect(scrollCall.args[1].scroll).toBe(scrollDuration);
    });
  });
});
