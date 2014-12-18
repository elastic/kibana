define(function (require) {
  return ['get computed fields', function () {
    var _ = require('lodash');

    var indexPattern, getComputedFields, fn;
    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      getComputedFields = require('components/index_patterns/_get_computed_fields');
      indexPattern.getComputedFields = getComputedFields.bind(indexPattern);
      fn = indexPattern.getComputedFields;

    }));

    it('should be a function', function () {
      expect(fn).to.be.a(Function);
    });

    it('should request all stored fields', function () {
      expect(fn().fields).to.contain('*');
    });

    it('should request _source seperately', function () {
      expect(fn().fields).to.contain('_source');
    });

    it('should request date fields as fielddata_fields', function () {
      expect(fn().fielddataFields).to.contain('@timestamp');
      expect(fn().fielddataFields).to.not.include.keys('bytes');
    });


  }];
});