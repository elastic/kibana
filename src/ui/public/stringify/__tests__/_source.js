import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ngMock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesHitsProvider from 'fixtures/hits';
describe('_source formatting', function () {

  var fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
  }));

  describe('Source format', function () {
    var indexPattern;
    var hits;
    var format;
    var convertHtml;

    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      hits = Private(FixturesHitsProvider);
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
