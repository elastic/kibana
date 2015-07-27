describe('_source formatting', function () {
  var $ = require('jquery');
  var _ = require('lodash');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(require('ui/registry/field_formats'));
  }));

  describe('Source format', function () {
    var indexPattern;
    var hits;
    var format;
    var convertHtml;

    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      hits = Private(require('fixtures/hits'));
      format = fieldFormats.getInstance('_source');
      convertHtml = format.getConverterFor('html');
    }));

    it('uses the _source, field, and hit to create a <dl>', function () {
      var hit = _.first(hits);
      var $dl = $(convertHtml(hit._source, indexPattern.fields.byName._source, hit));
      expect($dl.is('dl')).to.be.ok();
      expect($dl.find('dt')).to.have.length(_.keys(indexPattern.flattenHit(hit)).length);
    });
  });
});
