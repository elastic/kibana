define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('mapTerms()', function () {
      var sinon = require('test_utils/auto_release_sinon');
      var indexPattern, mapTerms, $rootScope, getIndexPatternStub;
      beforeEach(module('kibana'));

      beforeEach(function () {
        getIndexPatternStub = sinon.stub();
        module('kibana/courier', function ($provide) {
          $provide.service('courier', function () {
            var courier = { indexPatterns: { get: getIndexPatternStub } };
            return courier;
          });
        });
      });

      beforeEach(inject(function (Private, _$rootScope_, Promise) {
        $rootScope = _$rootScope_;
        mapTerms = Private(require('components/filter_bar/lib/mapTerms'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        getIndexPatternStub.returns(Promise.resolve(indexPattern));
      }));

      it('should return the key and value for matching filters', function (done) {
        var filter = { meta: { index: 'logstash-*' }, query: { match: { _type: { query: 'apache', type: 'phrase' } } } };
        mapTerms(filter).then(function (result) {
          expect(result).to.have.property('key', '_type');
          expect(result).to.have.property('value', 'apache');
          done();
        });
        $rootScope.$apply();
      });

      it('should return undefined for none matching', function (done) {
        var filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
        mapTerms(filter).catch(function (result) {
          expect(result).to.be(filter);
          done();
        });
        $rootScope.$apply();
      });

    });
  });
});
