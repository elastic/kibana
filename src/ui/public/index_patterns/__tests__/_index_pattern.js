import _ from 'lodash';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import Promise from 'bluebird';
import { DuplicateField } from 'ui/errors';
import { IndexedArray } from 'ui/indexed_array';
import FixturesLogstashFieldsProvider from 'fixtures/logstash_fields';
import FixturesStubbedDocSourceResponseProvider from 'fixtures/stubbed_doc_source_response';
import { AdminDocSourceProvider } from 'ui/courier/data_source/admin_doc_source';
import UtilsMappingSetupProvider from 'ui/utils/mapping_setup';
import { IndexPatternsIntervalsProvider } from 'ui/index_patterns/_intervals';
import { IndexPatternProvider } from 'ui/index_patterns/_index_pattern';
import NoDigestPromises from 'test_utils/no_digest_promises';

import { FieldsFetcherProvider } from '../fields_fetcher_provider';
import { StubIndexPatternsApiClientModule } from './stub_index_patterns_api_client';
import { IndexPatternsApiClientProvider } from '../index_patterns_api_client_provider';
import { IndexPatternsCalculateIndicesProvider } from '../_calculate_indices';

describe('index pattern', function () {
  NoDigestPromises.activateForSuite();

  let IndexPattern;
  let fieldsFetcher;
  let mappingSetup;
  let mockLogstashFields;
  let DocSource;
  let docSourceResponse;
  const indexPatternId = 'test-pattern';
  let indexPattern;
  let calculateIndices;
  let intervals;
  let indexPatternsApiClient;
  let defaultTimeField;

  beforeEach(ngMock.module('kibana', StubIndexPatternsApiClientModule, (PrivateProvider) => {
    PrivateProvider.swap(IndexPatternsCalculateIndicesProvider, () => {
      // stub calculateIndices
      calculateIndices = sinon.spy(function () {
        return Promise.resolve([
          { index: 'foo', max: Infinity, min: -Infinity },
          { index: 'bar', max: Infinity, min: -Infinity }
        ]);
      });

      return calculateIndices;
    });
  }));

  beforeEach(ngMock.inject(function (Private) {
    mockLogstashFields = Private(FixturesLogstashFieldsProvider);
    defaultTimeField = mockLogstashFields.find(f => f.type === 'date');
    docSourceResponse = Private(FixturesStubbedDocSourceResponseProvider);

    DocSource = Private(AdminDocSourceProvider);
    sinon.stub(DocSource.prototype, 'doIndex');
    sinon.stub(DocSource.prototype, 'fetch');

    // stub mappingSetup
    mappingSetup = Private(UtilsMappingSetupProvider);
    sinon.stub(mappingSetup, 'isDefined', function () {
      return Promise.resolve(true);
    });

    // spy on intervals
    intervals = Private(IndexPatternsIntervalsProvider);
    sinon.stub(intervals, 'toIndexList').returns([
      { index: 'foo', max: Infinity, min: -Infinity },
      { index: 'bar', max: Infinity, min: -Infinity }
    ]);

    IndexPattern = Private(IndexPatternProvider);
    fieldsFetcher = Private(FieldsFetcherProvider);
    indexPatternsApiClient = Private(IndexPatternsApiClientProvider);
  }));

  // create an indexPattern instance for each test
  beforeEach(function () {
    return create(indexPatternId).then(function (pattern) {
      indexPattern = pattern;
    });
  });

  // helper function to create index patterns
  function create(id, payload) {
    const indexPattern = new IndexPattern(id);
    DocSource.prototype.doIndex.returns(Promise.resolve(id));
    payload = _.defaults(payload || {}, docSourceResponse(id));
    setDocsourcePayload(payload);
    return indexPattern.init();
  }

  function setDocsourcePayload(payload) {
    DocSource.prototype.fetch.returns(Promise.resolve(payload));
  }

  describe('api', function () {
    it('should have expected properties', function () {
      return create('test-pattern').then(function (indexPattern) {
        // methods
        expect(indexPattern).to.have.property('refreshFields');
        expect(indexPattern).to.have.property('popularizeField');
        expect(indexPattern).to.have.property('getScriptedFields');
        expect(indexPattern).to.have.property('getNonScriptedFields');
        expect(indexPattern).to.have.property('getInterval');
        expect(indexPattern).to.have.property('addScriptedField');
        expect(indexPattern).to.have.property('removeScriptedField');
        expect(indexPattern).to.have.property('toString');
        expect(indexPattern).to.have.property('toJSON');
        expect(indexPattern).to.have.property('save');

        // properties
        expect(indexPattern).to.have.property('fields');
      });
    });
  });

  describe('init', function () {
    it('should append the found fields', function () {
      expect(DocSource.prototype.fetch.callCount).to.be(1);
      expect(indexPattern.fields).to.have.length(mockLogstashFields.length);
      expect(indexPattern.fields).to.be.an(IndexedArray);
    });
  });

  describe('fields', function () {
    it('should have expected properties on fields', function () {
      expect(indexPattern.fields[0]).to.have.property('displayName');
      expect(indexPattern.fields[0]).to.have.property('filterable');
      expect(indexPattern.fields[0]).to.have.property('format');
      expect(indexPattern.fields[0]).to.have.property('sortable');
      expect(indexPattern.fields[0]).to.have.property('scripted');
    });
  });

  describe('getScriptedFields', function () {
    it('should return all scripted fields', function () {
      const scriptedNames = _(mockLogstashFields).where({ scripted: true }).pluck('name').value();
      const respNames = _.pluck(indexPattern.getScriptedFields(), 'name');
      expect(respNames).to.eql(scriptedNames);
    });
  });

  describe('getNonScriptedFields', function () {
    it('should return all non-scripted fields', function () {
      const notScriptedNames = _(mockLogstashFields).where({ scripted: false }).pluck('name').value();
      const respNames = _.pluck(indexPattern.getNonScriptedFields(), 'name');
      expect(respNames).to.eql(notScriptedNames);
    });

  });

  describe('refresh fields', function () {
    it('should fetch fields from the fieldsFetcher', async function () {
      expect(indexPattern.fields.length).to.be.greaterThan(2);

      sinon.spy(fieldsFetcher, 'fetch');
      indexPatternsApiClient.swapStubNonScriptedFields([
        { name: 'foo' },
        { name: 'bar' }
      ]);

      await indexPattern.refreshFields();
      sinon.assert.calledOnce(fieldsFetcher.fetch);

      const newFields = indexPattern.getNonScriptedFields();
      expect(newFields).to.have.length(2);
      expect(newFields.map(f => f.name)).to.eql(['foo', 'bar']);
    });

    it('should preserve the scripted fields', async function () {
      // add spy to indexPattern.getScriptedFields
      sinon.spy(indexPattern, 'getScriptedFields');

      // refresh fields, which will fetch
      await indexPattern.refreshFields();

      // called to append scripted fields to the response from mapper.getFieldsForIndexPattern
      sinon.assert.calledOnce(indexPattern.getScriptedFields);
      expect(indexPattern.getScriptedFields().map(f => f.name))
        .to.eql(mockLogstashFields.filter(f => f.scripted).map(f => f.name));
    });
  });

  describe('add and remove scripted fields', function () {
    it('should append the scripted field', function () {
      // keep a copy of the current scripted field count
      const saveSpy = sinon.spy(indexPattern, 'save');
      const oldCount = indexPattern.getScriptedFields().length;

      // add a new scripted field
      const scriptedField = {
        name: 'new scripted field',
        script: 'false',
        type: 'boolean'
      };
      indexPattern.addScriptedField(scriptedField.name, scriptedField.script, scriptedField.type);
      const scriptedFields = indexPattern.getScriptedFields();
      expect(saveSpy.callCount).to.equal(1);
      expect(scriptedFields).to.have.length(oldCount + 1);
      expect(indexPattern.fields.byName[scriptedField.name].name).to.equal(scriptedField.name);
    });

    it('should remove scripted field, by name', function () {
      const saveSpy = sinon.spy(indexPattern, 'save');
      const scriptedFields = indexPattern.getScriptedFields();
      const oldCount = scriptedFields.length;
      const scriptedField = _.last(scriptedFields);

      indexPattern.removeScriptedField(scriptedField.name);

      expect(saveSpy.callCount).to.equal(1);
      expect(indexPattern.getScriptedFields().length).to.equal(oldCount - 1);
      expect(indexPattern.fields.byName[scriptedField.name]).to.equal(undefined);
    });

    it('should not allow duplicate names', function () {
      const scriptedFields = indexPattern.getScriptedFields();
      const scriptedField = _.last(scriptedFields);
      expect(function () {
        indexPattern.addScriptedField(scriptedField.name, '\'new script\'', 'string');
      }).to.throwError(function (e) {
        expect(e).to.be.a(DuplicateField);
      });
    });
  });

  describe('popularizeField', function () {
    it('should increment the poplarity count by default', function () {
      const saveSpy = sinon.stub(indexPattern, 'save');
      indexPattern.fields.forEach(function (field, i) {
        const oldCount = field.count;

        indexPattern.popularizeField(field.name);

        expect(saveSpy.callCount).to.equal(i + 1);
        expect(field.count).to.equal(oldCount + 1);
      });
    });

    it('should increment the poplarity count', function () {
      const saveSpy = sinon.stub(indexPattern, 'save');
      indexPattern.fields.forEach(function (field, i) {
        const oldCount = field.count;
        const incrementAmount = 4;

        indexPattern.popularizeField(field.name, incrementAmount);

        expect(saveSpy.callCount).to.equal(i + 1);
        expect(field.count).to.equal(oldCount + incrementAmount);
      });
    });

    it('should decrement the poplarity count', function () {
      indexPattern.fields.forEach(function (field) {
        const oldCount = field.count;
        const incrementAmount = 4;
        const decrementAmount = -2;

        indexPattern.popularizeField(field.name, incrementAmount);
        indexPattern.popularizeField(field.name, decrementAmount);

        expect(field.count).to.equal(oldCount + incrementAmount + decrementAmount);
      });
    });

    it('should not go below 0', function () {
      indexPattern.fields.forEach(function (field) {
        const decrementAmount = -Number.MAX_VALUE;
        indexPattern.popularizeField(field.name, decrementAmount);
        expect(field.count).to.equal(0);
      });
    });
  });

  describe('#toDetailedIndexList', function () {
    describe('when index pattern is an interval', function () {
      let interval;
      beforeEach(function () {
        interval = 'result:getInterval';
        sinon.stub(indexPattern, 'getInterval').returns(interval);
        sinon.stub(indexPattern, 'isTimeBasedInterval').returns(true);
      });

      it('invokes interval toDetailedIndexList with given start/stop times', async function () {
        await indexPattern.toDetailedIndexList(1, 2);
        const id = indexPattern.id;
        sinon.assert.calledWith(intervals.toIndexList, id, interval, 1, 2);
      });

      it('is fulfilled by the result of interval toDetailedIndexList', async function () {
        const indexList = await indexPattern.toDetailedIndexList();
        expect(indexList.map(i => i.index)).to.eql(['foo', 'bar']);
      });

      describe('with sort order', function () {
        it('passes the sort order to the intervals module', async function () {
          await indexPattern.toDetailedIndexList(1, 2, 'SORT_DIRECTION');
          sinon.assert.calledOnce(intervals.toIndexList);
          expect(intervals.toIndexList.getCall(0).args[4]).to.be('SORT_DIRECTION');
        });
      });
    });

    describe('when index pattern is a time-base wildcard', function () {
      beforeEach(function () {
        indexPattern.id = 'logstash-*';
        indexPattern.timeFieldName = defaultTimeField.name;
        indexPattern.intervalName = null;
        indexPattern.notExpandable = false;
      });

      it('invokes calculateIndices with given start/stop times and sortOrder', async function () {
        await indexPattern.toDetailedIndexList(1, 2, 'sortOrder');
        const id = indexPattern.id;
        const field = indexPattern.timeFieldName;
        expect(calculateIndices.calledWith(id, field, 1, 2, 'sortOrder')).to.be(true);
      });

      it('is fulfilled by the result of calculateIndices', async function () {
        const indexList = await indexPattern.toDetailedIndexList();
        expect(indexList[0].index).to.equal('foo');
        expect(indexList[1].index).to.equal('bar');
      });
    });

    describe('when index pattern is a time-base wildcard that is configured not to expand', function () {
      beforeEach(function () {
        indexPattern.id = 'logstash-*';
        indexPattern.timeFieldName = defaultTimeField.name;
        indexPattern.intervalName = null;
        indexPattern.notExpandable = true;
      });

      it('is fulfilled by id', async function () {
        const indexList = await indexPattern.toDetailedIndexList();
        expect(indexList.map(i => i.index)).to.eql([indexPattern.id]);
      });
    });

    describe('when index pattern is neither an interval nor a time-based wildcard', function () {
      beforeEach(function () {
        indexPattern.id = 'logstash-0';
        indexPattern.timeFieldName = null;
        indexPattern.intervalName = null;
        indexPattern.notExpandable = true;
      });

      it('is fulfilled by id', async function () {
        const indexList = await indexPattern.toDetailedIndexList();
        expect(indexList.map(i => i.index)).to.eql([indexPattern.id]);
      });
    });
  });

  describe('#toIndexList', function () {
    describe('when index pattern is an interval', function () {

      let interval;
      beforeEach(function () {
        indexPattern.id = '[logstash-]YYYY';
        indexPattern.timeFieldName = defaultTimeField.name;
        interval = intervals.byName.years;
        indexPattern.intervalName = interval.name;
        indexPattern.notExpandable = true;
      });

      it('invokes interval toIndexList with given start/stop times', async function () {
        await indexPattern.toIndexList(1, 2);
        const id = indexPattern.id;
        sinon.assert.calledWith(intervals.toIndexList, id, interval, 1, 2);
      });

      it('is fulfilled by the result of interval toIndexList', async function () {
        const indexList = await indexPattern.toIndexList();
        expect(indexList[0]).to.equal('foo');
        expect(indexList[1]).to.equal('bar');
      });

      describe('with sort order', function () {
        it('passes the sort order to the intervals module', function () {
          return indexPattern.toIndexList(1, 2, 'SORT_DIRECTION')
          .then(function () {
            expect(intervals.toIndexList.callCount).to.be(1);
            expect(intervals.toIndexList.getCall(0).args[4]).to.be('SORT_DIRECTION');
          });
        });
      });
    });

    describe('when index pattern is a time-base wildcard', function () {
      beforeEach(function () {
        indexPattern.id = 'logstash-*';
        indexPattern.timeFieldName = defaultTimeField.name;
        indexPattern.intervalName = null;
        indexPattern.notExpandable = false;
      });

      it('invokes calculateIndices with given start/stop times and sortOrder', async function () {
        await indexPattern.toIndexList(1, 2, 'sortOrder');
        const id = indexPattern.id;
        const field = indexPattern.timeFieldName;
        expect(calculateIndices.calledWith(id, field, 1, 2, 'sortOrder')).to.be(true);
      });

      it('is fulfilled by the result of calculateIndices', async function () {
        const indexList = await indexPattern.toIndexList();
        expect(indexList[0]).to.equal('foo');
        expect(indexList[1]).to.equal('bar');
      });
    });

    describe('when index pattern is a time-base wildcard that is configured not to expand', function () {
      beforeEach(function () {
        indexPattern.id = 'logstash-*';
        indexPattern.timeFieldName = defaultTimeField.name;
        indexPattern.intervalName = null;
        indexPattern.notExpandable = true;
      });

      it('is fulfilled using the id', async function () {
        const indexList = await indexPattern.toIndexList();
        expect(indexList).to.eql([indexPattern.id]);
      });
    });

    describe('when index pattern is neither an interval nor a time-based wildcard', function () {
      beforeEach(function () {
        indexPattern.id = 'logstash-0';
        indexPattern.timeFieldName = null;
        indexPattern.intervalName = null;
        indexPattern.notExpandable = true;
      });

      it('is fulfilled by id', async function () {
        const indexList = await indexPattern.toIndexList();
        expect(indexList).to.eql([indexPattern.id]);
      });
    });
  });

  describe('#isIndexExpansionEnabled()', function () {
    it('returns true if notExpandable is false', function () {
      indexPattern.notExpandable = false;
      expect(indexPattern.isIndexExpansionEnabled()).to.be(true);
    });
    it('returns true if notExpandable is not defined', function () {
      delete indexPattern.notExpandable;
      expect(indexPattern.isIndexExpansionEnabled()).to.be(true);
    });
    it('returns false if notExpandable is true', function () {
      indexPattern.notExpandable = true;
      expect(indexPattern.isIndexExpansionEnabled()).to.be(false);
    });
  });

  describe('#isTimeBased()', function () {
    beforeEach(function () {
      // for the sake of these tests, it doesn't much matter what type of field
      // this is so long as it exists
      indexPattern.timeFieldName = 'bytes';
    });
    it('returns false if no time field', function () {
      delete indexPattern.timeFieldName;
      expect(indexPattern.isTimeBased()).to.be(false);
    });
    it('returns false if time field does not actually exist in fields', function () {
      indexPattern.timeFieldName = 'does not exist';
      expect(indexPattern.isTimeBased()).to.be(false);
    });
    it('returns true if fields are not loaded yet', () => {
      indexPattern.fields = null;
      expect(indexPattern.isTimeBased()).to.be(true);
    });
    it('returns true if valid time field is configured', function () {
      expect(indexPattern.isTimeBased()).to.be(true);
    });
  });

  describe('#isWildcard()', function () {
    it('returns true if id has an *', function () {
      indexPattern.id = 'foo*';
      expect(indexPattern.isWildcard()).to.be(true);
    });
    it('returns false if id has no *', function () {
      indexPattern.id = 'foo';
      expect(indexPattern.isWildcard()).to.be(false);
    });
  });
});
