/* global sinon */
define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('mapRange()', function () {

			var mapRange, $rootScope, indexPattern, getIndexPatternStub;
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
        mapRange = Private(require('components/filter_bar/lib/mapRange'));
				$rootScope = _$rootScope_;
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        getIndexPatternStub.returns(Promise.resolve(indexPattern));
			}));

      it('should return the key and value for matching filters with gt/lt', function (done) {
        var filter = { meta: { index: 'logstash-*' }, range: { bytes: { lt: 2048, gt: 1024 } } };
        mapRange(filter).then(function (result) {
          expect(result).to.have.property('key', 'bytes');
          expect(result).to.have.property('value', '1024 to 2048');
          done();
        });
        $rootScope.$apply();
      });

      it('should return the key and value for matching filters with gte/lte', function (done) {
        var filter = { meta: { index: 'logstash-*' }, range: { bytes: { lte: 2048, gte: 1024 } } };
        mapRange(filter).then(function (result) {
          expect(result).to.have.property('key', 'bytes');
          expect(result).to.have.property('value', '1024 to 2048');
          done();
        });
        $rootScope.$apply();
      });

      it('should return undefined for none matching', function (done) {
        var filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
        mapRange(filter).catch(function (result) {
          expect(result).to.be(filter);
          done();
        });
        $rootScope.$apply();
      });

    });
  });
});
