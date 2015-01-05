define(function (require) {
  return ['remove', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var filterActions, mapFilter, $rootScope, Promise, getIndexPatternStub, indexPattern;

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

    beforeEach(inject(function (_Promise_, _$rootScope_, Private) {
        Promise = _Promise_;
        $rootScope = _$rootScope_;
        filterActions = Private(require('components/filter_bar/lib/filterActions'));
        mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

        getIndexPatternStub.returns(Promise.resolve(indexPattern));
      })
    );

    beforeEach(function () {
      var filters = [
        { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'foo' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'bar' } } } },
        { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
        { meta: { index: 'logstash-*', disabled: true }, missing: { field: 'host' } },
      ];

      Promise.map(filters, mapFilter)
      .then(function (filters) {
        $rootScope.state = { filters: filters };
      });
      $rootScope.$digest();
    });

    describe('removeFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).removeFilter;
      });

      it('should remove the filter from the state', function () {
        var filter = $rootScope.state.filters[2];
        fn(filter);
        expect($rootScope.state.filters).to.not.contain(filter);
      });
    });

    describe('removeAll', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).removeAll;
      });

      it('should remove all the filters', function () {
        expect($rootScope.state.filters).to.have.length(4);
        fn();
        expect($rootScope.state.filters).to.have.length(0);
      });
    });
  }];
});
