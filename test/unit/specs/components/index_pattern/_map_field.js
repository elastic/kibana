define(function (require) {
  return ['field mapping normalizer (mapField)', function () {
    var _ = require('lodash');

    var fn;
    var fields;
    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector, config) {
      config.set('metaFields', ['_id', '_timestamp']);
      fn = Private(require('components/index_patterns/_map_field'));
      fields = require('fixtures/field_mapping').test.mappings.testType;
    }));

    it('should be a function', function () {
      expect(fn).to.be.a(Function);
    });

    it('should return a modified copy of the object, not modify the original', function () {
      var pristine = _.cloneDeep(fields['foo.bar']);
      var mapped = fn(fields['foo.bar'], 'foo.bar');

      expect(fields['foo.bar']).to.not.eql(mapped);
      expect(fields['foo.bar']).to.eql(pristine);
    });

    it('should always consider _id to be indexed', function () {
      var mapped = fn(fields['_id'], '_id');
      expect(mapped.indexed).to.be(true);
    });

    it('should always consider _timestamp to be an indexed date', function () {
      var mapped = fn(fields['_timestamp'], '_timestamp');
      expect(mapped.indexed).to.be(true);
      expect(mapped.type).to.be('date');
    });

    it('should treat falsy and no as false for index', function () {
      var mapped = fn(fields['index_no_field'], 'index_no_field');
      expect(mapped.indexed).to.be(false);

      fields['index_no_field'].index = false;
      mapped = fn(fields['index_no_field'], 'index_no_field');
      expect(mapped.indexed).to.be(false);
    });

    it('should treat other values for index as true', function () {
      var mapped = fn(fields['not_analyzed_field'], 'not_analyzed_field');
      expect(mapped.indexed).to.be(true);
    });

  }];
});