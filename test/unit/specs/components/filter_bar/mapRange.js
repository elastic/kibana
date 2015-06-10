define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('mapRange()', function () {
      var sinon = require('test_utils/auto_release_sinon');
      var mapRange, $rootScope;
      beforeEach(module('kibana'));

      beforeEach(function () {
        module('kibana/courier', function ($provide) {
          $provide.service('courier', require('fixtures/mock_courier'));
        });
      });

      beforeEach(inject(function (Private, _$rootScope_) {
        mapRange = Private(require('components/filter_bar/lib/mapRange'));
        $rootScope = _$rootScope_;
      }));

      it('should return the key and value for matching filters with gt/lt', function (done) {
        var filter = { meta: { index: 'logstash-*' }, range: { bytes: { lt: 2048, gt: 1024 } } };
        mapRange(filter).then(function (result) {
          expect(result).to.have.property('key', 'bytes');
          expect(result).to.have.property('value', '1,024 to 2,048');
          done();
        });
        $rootScope.$apply();
      });

      it('should return the key and value for matching filters with gte/lte', function (done) {
        var filter = { meta: { index: 'logstash-*' }, range: { bytes: { lte: 2048, gte: 1024 } } };
        mapRange(filter).then(function (result) {
          expect(result).to.have.property('key', 'bytes');
          expect(result).to.have.property('value', '1,024 to 2,048');
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
