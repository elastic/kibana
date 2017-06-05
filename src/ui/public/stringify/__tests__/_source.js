import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesHitsProvider from 'fixtures/hits';
describe('_source formatting', function () {

  let fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
  }));

  describe('Source format', function () {
    let indexPattern;
    let hits;
    let format;
    let convertHtml;

    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      hits = Private(FixturesHitsProvider);
      format = fieldFormats.getInstance('_source');
      convertHtml = format.getConverterFor('html');
    }));

    it('should use the text content type if a field is not passed', function () {
      const hit = _.first(hits);
      expect(convertHtml(hit._source)).to.be(`<span ng-non-bindable>${JSON.stringify(hit._source)}</span>`);
    });

    it('uses the _source, field, and hit to create a <dl>', function () {
      const hit = _.first(hits);
      const $nonBindable = $(convertHtml(hit._source, indexPattern.fields.byName._source, hit));
      expect($nonBindable.is('span[ng-non-bindable]')).to.be.ok();
      const $dl = $nonBindable.children();
      expect($dl.is('dl')).to.be.ok();
      expect($dl.find('dt')).to.have.length(_.keys(indexPattern.flattenHit(hit)).length);
    });
  });
});
