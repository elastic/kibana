/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import Puid from 'puid';
import sinon from 'sinon';
import nodeCrypto from '@elastic/node-crypto';

import { CancellationToken } from '../../../../common/cancellation_token';
import { FieldFormatsService } from  '../../../../../../../../src/legacy/ui/field_formats/mixin/field_formats_service';
// Reporting uses an unconventional directory structure so the linter marks this as a violation
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { StringFormat } from '../../../../../../../../src/plugins/data/server';

import { executeJobFactory } from '../execute_job';

const delay = (ms) => new Promise(resolve => setTimeout(() => resolve(), ms));

const expectRejectedPromise = async (promise) => {
  let error = null;
  try {
    await promise;
  } catch (err) {
    error = err;
  } finally {
    expect(error).to.not.be(null);
    expect(error).to.be.an(Error);
  }
};

const puid = new Puid();
const getRandomScrollId = () => {
  return puid.generate();
};

describe('CSV Execute Job', function () {
  const encryptionKey = 'testEncryptionKey';
  const headers = {
    'sid': 'test'
  };
  let defaultElasticsearchResponse;
  let encryptedHeaders;

  let cancellationToken;
  let mockServer;
  let clusterStub;
  let callWithRequestStub;
  let uiSettingsGetStub;

  before(async function () {
    const crypto = nodeCrypto({ encryptionKey });
    encryptedHeaders = await crypto.encrypt(headers);
  });

  beforeEach(async function () {
    cancellationToken = new CancellationToken();

    defaultElasticsearchResponse = {
      hits: {
        hits: []
      },
      _scroll_id: 'defaultScrollId'
    };
    clusterStub = {
      callWithRequest: function () {}
    };

    callWithRequestStub = sinon.stub(clusterStub, 'callWithRequest').resolves(defaultElasticsearchResponse);

    const configGetStub = sinon.stub();
    uiSettingsGetStub = sinon.stub();
    uiSettingsGetStub.withArgs('csv:separator').returns(',');
    uiSettingsGetStub.withArgs('csv:quoteValues').returns(true);

    mockServer = {
      expose: function () {},
      fieldFormatServiceFactory: function () {
        const uiConfigMock = {};
        uiConfigMock['format:defaultTypeMap'] = {
          '_default_': { 'id': 'string', 'params': {} }
        };
        const getConfig = (key) => uiConfigMock[key];
        return new FieldFormatsService([StringFormat], getConfig);
      },
      plugins: {
        elasticsearch: {
          getCluster: function () {
            return clusterStub;
          }
        }
      },
      config: function () {
        return {
          get: configGetStub
        };
      },
      savedObjects: {
        getScopedSavedObjectsClient: sinon.stub()
      },
      uiSettingsServiceFactory: sinon.stub().returns({
        get: uiSettingsGetStub
      }),
      log: function () {}
    };
    mockServer.config().get.withArgs('xpack.reporting.encryptionKey').returns(encryptionKey);
    mockServer.config().get.withArgs('xpack.reporting.csv.maxSizeBytes').returns(1024 * 1000); // 1mB
    mockServer.config().get.withArgs('xpack.reporting.csv.scroll').returns({});
  });

  describe('calls getScopedSavedObjectsClient with request', function () {
    it('containing decrypted headers', async function () {
      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);
      expect(mockServer.savedObjects.getScopedSavedObjectsClient.calledOnce).to.be(true);
      expect(mockServer.savedObjects.getScopedSavedObjectsClient.firstCall.args[0].headers).to.be.eql(headers);
    });

    it(`containing getBasePath() returning server's basePath if the job doesn't have one`, async function () {
      const serverBasePath = '/foo-server/basePath/';
      mockServer.config().get.withArgs('server.basePath').returns(serverBasePath);
      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);
      expect(mockServer.savedObjects.getScopedSavedObjectsClient.calledOnce).to.be(true);
      expect(mockServer.savedObjects.getScopedSavedObjectsClient.firstCall.args[0].getBasePath()).to.be.eql(serverBasePath);
    });

    it(`containing getBasePath() returning job's basePath if the job has one`, async function () {
      const serverBasePath = '/foo-server/basePath/';
      mockServer.config().get.withArgs('server.basePath').returns(serverBasePath);
      const executeJob = executeJobFactory(mockServer);
      const jobBasePath = 'foo-job/basePath/';
      await executeJob(
        'job789',
        { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null }, basePath: jobBasePath },
        cancellationToken
      );
      expect(mockServer.savedObjects.getScopedSavedObjectsClient.calledOnce).to.be(true);
      expect(mockServer.savedObjects.getScopedSavedObjectsClient.firstCall.args[0].getBasePath()).to.be.eql(jobBasePath);
    });
  });

  describe('uiSettings', function () {
    it('passed scoped SavedObjectsClient to uiSettingsServiceFactory', async function () {
      const returnValue = Symbol();
      mockServer.savedObjects.getScopedSavedObjectsClient.returns(returnValue);
      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);
      expect(mockServer.uiSettingsServiceFactory.calledOnce).to.be(true);
      expect(mockServer.uiSettingsServiceFactory.firstCall.args[0].savedObjectsClient).to.be(returnValue);
    });
  });

  describe('basic Elasticsearch call behavior', function () {
    it('should decrypt encrypted headers and pass to callWithRequest', async function () {
      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);
      expect(callWithRequestStub.called).to.be(true);
      expect(callWithRequestStub.firstCall.args[0].headers).to.be.eql(headers);
    });

    it('should pass the index and body to execute the initial search', async function () {
      const index = 'index';
      const body = {
        testBody: true
      };

      const executeJob = executeJobFactory(mockServer);
      const job = {
        headers: encryptedHeaders,
        fields: [],
        searchRequest: {
          index,
          body
        }
      };

      await executeJob('job777', job, cancellationToken);

      const searchCall = callWithRequestStub.firstCall;
      expect(searchCall.args[1]).to.be('search');
      expect(searchCall.args[2].index).to.be(index);
      expect(searchCall.args[2].body).to.be(body);
    });

    it('should pass the scrollId from the initial search to the subsequent scroll', async function () {
      const scrollId = getRandomScrollId();
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{}]
        },
        _scroll_id: scrollId
      });
      callWithRequestStub.onSecondCall().resolves(defaultElasticsearchResponse);
      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);

      const scrollCall = callWithRequestStub.secondCall;

      expect(scrollCall.args[1]).to.be('scroll');
      expect(scrollCall.args[2].scrollId).to.be(scrollId);
    });

    it('should not execute scroll if there are no hits from the search', async function () {
      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);

      expect(callWithRequestStub.callCount).to.be(2);

      const searchCall = callWithRequestStub.firstCall;
      expect(searchCall.args[1]).to.be('search');

      const clearScrollCall = callWithRequestStub.secondCall;
      expect(clearScrollCall.args[1]).to.be('clearScroll');
    });

    it('should stop executing scroll if there are no hits', async function () {
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{}]
        },
        _scroll_id: 'scrollId'
      });
      callWithRequestStub.onSecondCall().resolves({
        hits: {
          hits: []
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);

      expect(callWithRequestStub.callCount).to.be(3);

      const searchCall = callWithRequestStub.firstCall;
      expect(searchCall.args[1]).to.be('search');

      const scrollCall = callWithRequestStub.secondCall;
      expect(scrollCall.args[1]).to.be('scroll');

      const clearScroll = callWithRequestStub.thirdCall;
      expect(clearScroll.args[1]).to.be('clearScroll');
    });

    it('should call clearScroll with scrollId when there are no more hits', async function () {
      const lastScrollId = getRandomScrollId();
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{}]
        },
        _scroll_id: 'scrollId'
      });

      callWithRequestStub.onSecondCall().resolves({
        hits: {
          hits: [],
        },
        _scroll_id: lastScrollId
      });

      const executeJob = executeJobFactory(mockServer);
      await executeJob('job456', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);

      const lastCall = callWithRequestStub.getCall(callWithRequestStub.callCount - 1);
      expect(lastCall.args[1]).to.be('clearScroll');
      expect(lastCall.args[2].scrollId).to.eql([lastScrollId]);
    });

    it('calls clearScroll when there is an error iterating the hits', async function () {
      const lastScrollId = getRandomScrollId();
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{
            _source: {
              one: 'foo',
              two: 'bar'
            }
          }]
        },
        _scroll_id: lastScrollId
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: undefined,
        searchRequest: { index: null, body: null }
      };
      await expectRejectedPromise(executeJob('job123', jobParams, cancellationToken));

      const lastCall = callWithRequestStub.getCall(callWithRequestStub.callCount - 1);
      expect(lastCall.args[1]).to.be('clearScroll');
      expect(lastCall.args[2].scrollId).to.eql([lastScrollId]);
    });
  });

  describe('Cells with formula values', () => {
    it('returns `csv_contains_formulas` when cells contain formulas', async function () {
      mockServer.config().get.withArgs('xpack.reporting.csv.checkForFormulas').returns(true);
      callWithRequestStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { 'one': '=SUM(A1:A2)', 'two': 'bar' } }]
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob('job123', jobParams, cancellationToken);

      expect(csvContainsFormulas).to.equal(true);
    });

    it('returns warnings when headings contain formulas', async function () {
      mockServer.config().get.withArgs('xpack.reporting.csv.checkForFormulas').returns(true);
      callWithRequestStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { '=SUM(A1:A2)': 'foo', 'two': 'bar' } }]
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ '=SUM(A1:A2)', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob('job123', jobParams, cancellationToken);

      expect(csvContainsFormulas).to.equal(true);
    });

    it('returns no warnings when cells have no formulas', async function () {
      mockServer.config().get.withArgs('xpack.reporting.csv.checkForFormulas').returns(true);
      callWithRequestStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { 'one': 'foo', 'two': 'bar' } }]
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob('job123', jobParams, cancellationToken);

      expect(csvContainsFormulas).to.equal(false);
    });

    it('returns no warnings when configured not to', async () => {
      mockServer.config().get.withArgs('xpack.reporting.csv.checkForFormulas').returns(false);
      callWithRequestStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { 'one': '=SUM(A1:A2)', 'two': 'bar' } }]
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };
      const { csv_contains_formulas: csvContainsFormulas } = await executeJob('job123', jobParams, cancellationToken);

      expect(csvContainsFormulas).to.equal(false);
    });
  });

  describe('Elasticsearch call errors', function () {
    it('should reject Promise if search call errors out', async function () {
      callWithRequestStub.rejects(new Error());
      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } };
      await expectRejectedPromise(executeJob('job123', jobParams, cancellationToken));
    });

    it('should reject Promise if scroll call errors out', async function () {
      callWithRequestStub.onFirstCall().resolves(
        {
          hits: {
            hits: [{}]
          },
          _scroll_id: 'scrollId'
        });
      callWithRequestStub.onSecondCall().rejects(new Error());
      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } };
      await expectRejectedPromise(executeJob('job123', jobParams, cancellationToken));
    });
  });

  describe('invalid responses', function () {
    it('should reject Promise if search returns hits but no _scroll_id', async function () {
      callWithRequestStub.resolves({
        hits: {
          hits: [{}]
        },
        _scroll_id: undefined
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } };
      await expectRejectedPromise(executeJob('job123', jobParams, cancellationToken));
    });

    it('should reject Promise if search returns no hits and no _scroll_id', async function () {
      callWithRequestStub.resolves({
        hits: {
          hits: []
        },
        _scroll_id: undefined
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } };
      await expectRejectedPromise(executeJob('job123', jobParams, cancellationToken));
    });

    it('should reject Promise if scroll returns hits but no _scroll_id', async function () {
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{}]
        },
        _scroll_id: 'scrollId'
      });

      callWithRequestStub.onSecondCall().resolves({
        hits: {
          hits: [{}]
        },
        _scroll_id: undefined
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } };
      await expectRejectedPromise(executeJob('job123', jobParams, cancellationToken));
    });

    it('should reject Promise if scroll returns no hits and no _scroll_id', async function () {
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{}]
        },
        _scroll_id: 'scrollId'
      });

      callWithRequestStub.onSecondCall().resolves({
        hits: {
          hits: []
        },
        _scroll_id: undefined
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } };
      await expectRejectedPromise(executeJob('job123', jobParams, cancellationToken));
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/43069
  describe.skip('cancellation', function () {
    const scrollId = getRandomScrollId();

    beforeEach(function () {
      // We have to "re-stub" the callWithRequest stub here so that we can use the fakeFunction
      // that delays the Promise resolution so we have a chance to call cancellationToken.cancel().
      // Otherwise, we get into an endless loop, and don't have a chance to call cancel
      callWithRequestStub.restore();
      callWithRequestStub = sinon.stub(clusterStub, 'callWithRequest').callsFake(async function () {
        await delay(1);
        return {
          hits: {
            hits: [{}]
          },
          _scroll_id: scrollId
        };
      });
    });

    it('should stop calling Elasticsearch when cancellationToken.cancel is called', async function () {
      const executeJob = executeJobFactory(mockServer);
      executeJob('job345', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);

      await delay(100);
      const callCount = callWithRequestStub.callCount;
      cancellationToken.cancel();
      await delay(100);
      expect(callWithRequestStub.callCount).to.be(callCount + 1); // last call is to clear the scroll
    });

    it(`shouldn't call clearScroll if it never got a scrollId`, async function () {
      const executeJob = executeJobFactory(mockServer);
      executeJob('job345', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);
      cancellationToken.cancel();

      for(let i = 0; i < callWithRequestStub.callCount; ++i) {
        expect(callWithRequestStub.getCall(i).args[1]).to.not.be('clearScroll');
      }
    });

    it('should call clearScroll if it got a scrollId', async function () {
      const executeJob = executeJobFactory(mockServer);
      executeJob('job345', { headers: encryptedHeaders, fields: [], searchRequest: { index: null, body: null } }, cancellationToken);
      await delay(100);
      cancellationToken.cancel();
      await delay(100);

      const lastCall = callWithRequestStub.getCall(callWithRequestStub.callCount - 1);
      expect(lastCall.args[1]).to.be('clearScroll');
      expect(lastCall.args[2].scrollId).to.eql([scrollId]);
    });
  });

  describe('csv content', function () {
    it('should write column headers to output, even if there are no results', async function () {
      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [ 'one', 'two' ], searchRequest: { index: null, body: null } };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).to.be(`one,two\n`);
    });

    it('should use custom uiSettings csv:separator for header', async function () {
      uiSettingsGetStub.withArgs('csv:separator').returns(';');
      const executeJob = executeJobFactory(mockServer);
      const jobParams = { headers: encryptedHeaders, fields: [ 'one', 'two' ], searchRequest: { index: null, body: null } };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).to.be(`one;two\n`);
    });

    it('should escape column headers if uiSettings csv:quoteValues is true', async function () {
      uiSettingsGetStub.withArgs('csv:quoteValues').returns(true);
      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one and a half', 'two', 'three-and-four', 'five & six' ],
        searchRequest: { index: null, body: null }
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).to.be(`"one and a half",two,"three-and-four","five & six"\n`);
    });

    it(`shouldn't escape column headers if uiSettings csv:quoteValues is false`, async function () {
      uiSettingsGetStub.withArgs('csv:quoteValues').returns(false);
      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one and a half', 'two', 'three-and-four', 'five & six' ],
        searchRequest: { index: null, body: null }
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      expect(content).to.be(`one and a half,two,three-and-four,five & six\n`);
    });

    it('should write column headers to output, when there are results', async function () {
      const executeJob = executeJobFactory(mockServer);
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{ one: '1', two: '2' }]
        },
        _scroll_id: 'scrollId'
      });

      const jobParams = { headers: encryptedHeaders, fields: [ 'one', 'two' ], searchRequest: { index: null, body: null } };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');
      const headerLine = lines[0];
      expect(headerLine).to.be('one,two');
    });

    it('should use comma separated values of non-nested fields from _source', async function () {
      const executeJob = executeJobFactory(mockServer);
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { 'one': 'foo', 'two': 'bar' } }]
        },
        _scroll_id: 'scrollId'
      });

      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null }
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');
      const valuesLine = lines[1];
      expect(valuesLine).to.be('foo,bar');
    });

    it('should concatenate the hits from multiple responses', async function () {
      const executeJob = executeJobFactory(mockServer);
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { 'one': 'foo', 'two': 'bar' } }]
        },
        _scroll_id: 'scrollId'
      });
      callWithRequestStub.onSecondCall().resolves({
        hits: {
          hits: [{ _source: { 'one': 'baz', 'two': 'qux' } }]
        },
        _scroll_id: 'scrollId'
      });

      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null }
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');

      expect(lines[1]).to.be('foo,bar');
      expect(lines[2]).to.be('baz,qux');
    });

    it('should use field formatters to format fields', async function () {
      const executeJob = executeJobFactory(mockServer);
      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { 'one': 'foo', 'two': 'bar' } }]
        },
        _scroll_id: 'scrollId'
      });

      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
        indexPatternSavedObject: {
          id: 'logstash-*',
          type: 'index-pattern',
          attributes: {
            title: 'logstash-*',
            fields: '[{"name":"one","type":"string"}, {"name":"two","type":"string"}]',
            fieldFormatMap: '{"one":{"id":"string","params":{"transform": "upper"}}}'
          }
        }
      };
      const { content } = await executeJob('job123', jobParams, cancellationToken);
      const lines = content.split('\n');

      expect(lines[1]).to.be('FOO,bar');
    });
  });

  describe('maxSizeBytes', function () {
    // The following tests use explicitly specified lengths. UTF-8 uses between one and four 8-bit bytes for each
    // code-point. However, any character that can be represented by ASCII requires one-byte, so a majority of the
    // tests use these 'simple' characters to make the math easier

    describe('when only the headers exceed the maxSizeBytes', function () {
      let content;
      let maxSizeReached;

      beforeEach(async function () {
        mockServer.config().get.withArgs('xpack.reporting.csv.maxSizeBytes').returns(1);

        const executeJob = executeJobFactory(mockServer);
        const jobParams = { headers: encryptedHeaders, fields: [ 'one', 'two' ], searchRequest: { index: null, body: null } };

        ({ content, max_size_reached: maxSizeReached } = await executeJob('job123', jobParams, cancellationToken));
      });

      it('should return max_size_reached', function () {
        expect(maxSizeReached).to.be(true);
      });

      it('should return empty content', function () {
        expect(content).to.be('');
      });
    });

    describe('when headers are equal to maxSizeBytes', function () {
      let content;
      let maxSizeReached;

      beforeEach(async function () {
        mockServer.config().get.withArgs('xpack.reporting.csv.maxSizeBytes').returns(9);

        const executeJob = executeJobFactory(mockServer);
        const jobParams = { headers: encryptedHeaders, fields: [ 'one', 'two' ], searchRequest: { index: null, body: null } };

        ({ content, max_size_reached: maxSizeReached } = await executeJob('job123', jobParams, cancellationToken));
      });

      it(`shouldn't return max_size_reached`, function () {
        expect(maxSizeReached).to.be(false);
      });

      it(`should return content`, function () {
        expect(content).to.be('one,two\n');
      });
    });

    describe('when the data exceeds the maxSizeBytes', function () {
      let content;
      let maxSizeReached;

      beforeEach(async function () {
        mockServer.config().get.withArgs('xpack.reporting.csv.maxSizeBytes').returns(9);

        callWithRequestStub.onFirstCall().returns({
          hits: {
            hits: [{ _source: { 'one': 'foo', 'two': 'bar' } }]
          },
          _scroll_id: 'scrollId'
        });

        const executeJob = executeJobFactory(mockServer);
        const jobParams = {
          headers: encryptedHeaders,
          fields: [ 'one', 'two' ],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        };

        ({ content, max_size_reached: maxSizeReached } = await executeJob('job123', jobParams, cancellationToken));
      });

      it(`should return max_size_reached`, function () {
        expect(maxSizeReached).to.be(true);
      });

      it(`should return the headers in the content`, function () {
        expect(content).to.be('one,two\n');
      });
    });

    describe('when headers and data equal the maxSizeBytes', function () {
      let content;
      let maxSizeReached;

      beforeEach(async function () {
        mockServer.config().get.withArgs('xpack.reporting.csv.maxSizeBytes').returns(18);

        callWithRequestStub.onFirstCall().returns({
          hits: {
            hits: [{ _source: { 'one': 'foo', 'two': 'bar' } }]
          },
          _scroll_id: 'scrollId'
        });

        const executeJob = executeJobFactory(mockServer);
        const jobParams = {
          headers: encryptedHeaders,
          fields: [ 'one', 'two' ],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        };

        ({ content, max_size_reached: maxSizeReached } = await executeJob('job123', jobParams, cancellationToken));
      });

      it(`shouldn't return max_size_reached`, async function () {
        expect(maxSizeReached).to.be(false);
      });

      it('should return headers and data in content', function () {
        expect(content).to.be('one,two\nfoo,bar\n');
      });
    });
  });

  describe('scroll settings', function () {
    it('passes scroll duration to initial search call', async function () {
      const scrollDuration = 'test';
      mockServer.config().get.withArgs('xpack.reporting.csv.scroll').returns({ duration: scrollDuration });

      callWithRequestStub.onFirstCall().returns({
        hits: {
          hits: [{ }]
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };

      await executeJob('job123', jobParams, cancellationToken);

      const searchCall = callWithRequestStub.firstCall;
      expect(searchCall.args[1]).to.be('search');
      expect(searchCall.args[2].scroll).to.be(scrollDuration);
    });

    it('passes scroll size to initial search call', async function () {
      const scrollSize = 100;
      mockServer.config().get.withArgs('xpack.reporting.csv.scroll').returns({ size: scrollSize });

      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{ }]
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };

      await executeJob('job123', jobParams, cancellationToken);

      const searchCall = callWithRequestStub.firstCall;
      expect(searchCall.args[1]).to.be('search');
      expect(searchCall.args[2].size).to.be(scrollSize);
    });

    it('passes scroll duration to subsequent scroll call', async function () {
      const scrollDuration = 'test';
      mockServer.config().get.withArgs('xpack.reporting.csv.scroll').returns({ duration: scrollDuration });

      callWithRequestStub.onFirstCall().resolves({
        hits: {
          hits: [{ }]
        },
        _scroll_id: 'scrollId'
      });

      const executeJob = executeJobFactory(mockServer);
      const jobParams = {
        headers: encryptedHeaders,
        fields: [ 'one', 'two' ],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      };

      await executeJob('job123', jobParams, cancellationToken);

      const scrollCall = callWithRequestStub.secondCall;
      expect(scrollCall.args[1]).to.be('scroll');
      expect(scrollCall.args[2].scroll).to.be(scrollDuration);
    });
  });
});
