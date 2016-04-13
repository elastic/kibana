describe('_source formatting', function () {
  let $ = require('jquery');
  let _ = require('lodash');
  let expect = require('expect.js');
  let ngMock = require('ngMock');

  let fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(require('ui/registry/field_formats'));
  }));

  describe('Source format', function () {
    let indexPattern;
    let hits;
    let format;
    let convertHtml;

    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      hits = Private(require('fixtures/hits'));
      format = fieldFormats.getInstance('_source');
      convertHtml = format.getConverterFor('html');
    }));

    it('uses the _source, field, and hit to create a <dl>', function () {
      let hit = _.first(hits);
      let $dl = $(convertHtml(hit._source, indexPattern.fields.byName._source, hit));
      expect($dl.is('dl')).to.be.ok();
      expect($dl.find('dt')).to.have.length(_.keys(indexPattern.flattenHit(hit)).length);
    });
  });
});
