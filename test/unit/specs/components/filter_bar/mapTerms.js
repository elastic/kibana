define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('mapTerms()', function () {
      var sinon = require('test_utils/auto_release_sinon');
      var mapTerms, $rootScope;
      beforeEach(module('kibana'));

      beforeEach(function () {
        module('kibana/courier', function ($provide) {
          $provide.service('courier', require('fixtures/mock_courier'));
        });
      });

      beforeEach(inject(function (Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        mapTerms = Private(require('components/filter_bar/lib/mapTerms'));
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
