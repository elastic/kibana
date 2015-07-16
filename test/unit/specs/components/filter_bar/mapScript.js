define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('mapScript()', function () {
      var sinon = require('test_utils/auto_release_sinon');
      var mapScript, $rootScope;
      beforeEach(module('kibana'));

      beforeEach(function () {
        module('kibana/courier', function ($provide) {
          $provide.service('courier', require('fixtures/mock_courier'));
        });
      });

      beforeEach(inject(function (Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        mapScript = Private(require('ui/filter_bar/lib/mapScript'));
      }));

      it('should return the key and value for matching filters', function (done) {
        var filter = {
          meta: { index: 'logstash-*', field: 'script number' },
          script: { script: 'doc["script number"].value * 5', params: { value: 35}}
        };
        mapScript(filter).then(function (result) {
          expect(result).to.have.property('key', 'script number');
          expect(result).to.have.property('value', '35');
          done();
        });
        $rootScope.$apply();
      });

      it('should return undefined for none matching', function (done) {
        var filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
        mapScript(filter).catch(function (result) {
          expect(result).to.be(filter);
          done();
        });
        $rootScope.$apply();
      });

    });
  });
});