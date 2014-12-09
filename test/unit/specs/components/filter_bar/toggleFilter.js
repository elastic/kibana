/* global sinon */
define(function (require) {
  var toggleFilter = require('components/filter_bar/lib/toggleFilter');

  describe('Filter Bar Directive', function () {

    var $rootScope, $compile, mapFilter, getIndexPatternStub, indexPattern;

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

    beforeEach(inject(function (Promise, Private, _$rootScope_, _$compile_) {
      mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      getIndexPatternStub.returns(Promise.resolve(indexPattern));
      $rootScope.state = {
        filters: [
          { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
          { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
          { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
          { missing: { field: 'host' }, meta: { disabled: true, index: 'logstash-*' } },
        ]
      };
    }));

    describe('toggleFilter', function () {
      it('should toggle filters on and off', function (done) {
        var filter = $rootScope.state.filters[0];
        var fn = toggleFilter($rootScope);
        mapFilter(filter).then(fn).then(function (result) {
          expect(result.meta).to.have.property('disabled', true);
          done();
        });
        $rootScope.$apply();
      });
    });

  });
});

