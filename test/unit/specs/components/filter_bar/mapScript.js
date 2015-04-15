define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('mapScript()', function () {
      var sinon = require('test_utils/auto_release_sinon');
      var indexPattern, mapScript, $rootScope, getIndexPatternStub;
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
        mapScript = Private(require('components/filter_bar/lib/mapScript'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        getIndexPatternStub.returns(Promise.resolve(indexPattern));
      }));

      it('should return the key and value for matching filters', function (done) {
        var filter = {
          meta: { index: 'logstash-*', field: 'script number' },
          script: { script: 'doc["script number"].value * 5', params: { value: 35}}
        };
        mapScript(filter).then(function (result) {
          expect(result).to.have.property('key', 'script number');
          expect(result).to.have.property('value', 35);
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