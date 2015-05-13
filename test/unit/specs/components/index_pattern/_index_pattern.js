define(function (require) {
  return ['index pattern', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var Promise = require('bluebird');
    var errors = require('errors');
    var IndexedArray = require('utils/indexed_array/index');
    var IndexPattern;
    var mapper;
    var mappingSetup;
    var mockLogstashFields;
    var DocSource;
    var config;
    var docSourceResponse;
    var indexPatternId = 'test-pattern';
    var indexPattern;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector, _config_) {
      config = _config_;
      mockLogstashFields = Private(require('fixtures/logstash_fields'));
      docSourceResponse = Private(require('fixtures/stubbed_doc_source_response'));

      DocSource = Private(require('components/courier/data_source/doc_source'));
      sinon.stub(DocSource.prototype, 'doIndex');
      sinon.stub(DocSource.prototype, 'fetch');

      // stub mapper
      mapper = Private(require('components/index_patterns/_mapper'));
      sinon.stub(mapper, 'getFieldsForIndexPattern', function () {
        return Promise.resolve(_.filter(mockLogstashFields, { scripted: false }));
      });

      // stub mappingSetup
      mappingSetup = Private(require('utils/mapping_setup'));
      sinon.stub(mappingSetup, 'isDefined', function () {
        return Promise.resolve(true);
      });

      IndexPattern = Private(require('components/index_patterns/_index_pattern'));
    }));

    // create an indexPattern instance for each test
    beforeEach(function () {
      return create(indexPatternId).then(function (pattern) {
        indexPattern = pattern;
      });
    });

    // helper function to create index patterns
    function create(id, payload) {
      var indexPattern = new IndexPattern(id);
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
        expect(indexPattern.fields[0]).to.have.property('bucketable');
        expect(indexPattern.fields[0]).to.have.property('displayName');
        expect(indexPattern.fields[0]).to.have.property('filterable');
        expect(indexPattern.fields[0]).to.have.property('format');
        expect(indexPattern.fields[0]).to.have.property('sortable');
        expect(indexPattern.fields[0]).to.have.property('scripted');
      });
    });

    describe('getScriptedFields', function () {
      it('should return all scripted fields', function () {
        var scriptedNames = _(mockLogstashFields).where({ scripted: true }).pluck('name').value();
        var respNames = _.pluck(indexPattern.getScriptedFields(), 'name');
        expect(respNames).to.eql(scriptedNames);
      });
    });

    describe('getNonScriptedFields', function () {
      it('should return all non-scripted fields', function () {
        var notScriptedNames = _(mockLogstashFields).where({ scripted: false }).pluck('name').value();
        var respNames = _.pluck(indexPattern.getNonScriptedFields(), 'name');
        expect(respNames).to.eql(notScriptedNames);
      });

    });

    describe('refresh fields', function () {
      // override the default indexPattern, with a truncated field list
      require('test_utils/no_digest_promises').activateForSuite();
      var indexPatternId = 'test-pattern';
      var indexPattern;
      var fieldLength;
      var truncatedFields;

      beforeEach(function () {
        fieldLength = mockLogstashFields.length;
        truncatedFields = mockLogstashFields.slice(3);
        return create(indexPatternId, {
          _source: {
            customFormats: '{}',
            fields: JSON.stringify(truncatedFields)
          }
        }).then(function (pattern) {
          indexPattern = pattern;
        });
      });

      it('should fetch fields from the doc source', function () {
        // ensure that we don't have all the fields
        expect(truncatedFields.length).to.not.equal(mockLogstashFields.length);
        expect(indexPattern.fields).to.have.length(truncatedFields.length);

        // ensure that all fields will be included in the returned docSource
        setDocsourcePayload(docSourceResponse(indexPatternId));

        return Promise.all([
          // read fields from elasticsearch
          mapper.getFieldsForIndexPattern(),

          // tell the index pattern to do the same
          indexPattern.refreshFields(),
        ])
        .then(function (data) {
          var expected = data[0]; // just the fields in the index
          var fields = indexPattern.getNonScriptedFields(); // get all but scripted fields

          expect(_.pluck(fields, 'name')).to.eql(_.pluck(expected, 'name'));
        });
      });

      it('should preserve the scripted fields', function () {
        // ensure that all fields will be included in the returned docSource
        setDocsourcePayload(docSourceResponse(indexPatternId));

        // add spy to indexPattern.getScriptedFields
        var scriptedFieldsSpy = sinon.spy(indexPattern, 'getScriptedFields');

        // refresh fields, which will fetch
        return indexPattern.refreshFields().then(function () {
          // called to append scripted fields to the response from mapper.getFieldsForIndexPattern
          expect(scriptedFieldsSpy.callCount).to.equal(1);

          var scripted = _.where(mockLogstashFields, { scripted: true });
          var expected = _.filter(indexPattern.fields, { scripted: true });
          expect(_.pluck(expected, 'name')).to.eql(_.pluck(scripted, 'name'));
        });
      });
    });

    describe('add and remove scripted fields', function () {
      it('should append the scripted field', function () {
        // keep a copy of the current scripted field count
        var saveSpy = sinon.spy(indexPattern, 'save');
        var oldCount = indexPattern.getScriptedFields().length;

        // add a new scripted field
        var scriptedField = {
          name: 'new scripted field',
          script: 'false',
          type: 'boolean'
        };
        indexPattern.addScriptedField(scriptedField.name, scriptedField.script, scriptedField.type);
        indexPattern._indexFields(); // normally triggered by docSource.onUpdate()

        var scriptedFields = indexPattern.getScriptedFields();
        expect(saveSpy.callCount).to.equal(1);
        expect(scriptedFields).to.have.length(oldCount + 1);
        expect(indexPattern.fields.byName[scriptedField.name].displayName).to.equal(scriptedField.name);
      });

      it('should remove scripted field, by name', function () {
        var saveSpy = sinon.spy(indexPattern, 'save');
        var scriptedFields = indexPattern.getScriptedFields();
        var oldCount = scriptedFields.length;
        var scriptedField = _.last(scriptedFields);

        indexPattern.removeScriptedField(scriptedField.name);

        expect(saveSpy.callCount).to.equal(1);
        expect(indexPattern.getScriptedFields().length).to.equal(oldCount - 1);
        expect(indexPattern.fields.byName[scriptedField.name]).to.equal(undefined);
      });

      it('should not allow duplicate names', function () {
        var scriptedFields = indexPattern.getScriptedFields();
        var scriptedField = _.last(scriptedFields);
        expect(function () {
          indexPattern.addScriptedField(scriptedField.name, '\'new script\'', 'string');
        }).to.throwError(function (e) {
          expect(e).to.be.a(errors.DuplicateField);
        });
      });
    });

    describe('popularizeField', function () {
      it('should increment the poplarity count by default', function () {
        var saveSpy = sinon.stub(indexPattern, 'save');
        indexPattern.fields.forEach(function (field, i) {
          var oldCount = field.count;

          indexPattern.popularizeField(field.name);

          expect(saveSpy.callCount).to.equal(i + 1);
          expect(field.count).to.equal(oldCount + 1);
        });
      });

      it('should increment the poplarity count', function () {
        var saveSpy = sinon.stub(indexPattern, 'save');
        indexPattern.fields.forEach(function (field, i) {
          var oldCount = field.count;
          var incrementAmount = 4;

          indexPattern.popularizeField(field.name, incrementAmount);

          expect(saveSpy.callCount).to.equal(i + 1);
          expect(field.count).to.equal(oldCount + incrementAmount);
        });
      });

      it('should decrement the poplarity count', function () {
        indexPattern.fields.forEach(function (field, i) {
          var oldCount = field.count;
          var incrementAmount = 4;
          var decrementAmount = -2;

          indexPattern.popularizeField(field.name, incrementAmount);
          indexPattern.popularizeField(field.name, decrementAmount);

          expect(field.count).to.equal(oldCount + incrementAmount + decrementAmount);
        });
      });

      it('should not go below 0', function () {
        indexPattern.fields.forEach(function (field) {
          var decrementAmount = -Number.MAX_VALUE;
          indexPattern.popularizeField(field.name, decrementAmount);
          expect(field.count).to.equal(0);
        });
      });
    });
  }];
});
