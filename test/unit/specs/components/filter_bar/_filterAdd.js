define(function (require) {
  return ['add', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var filterActions, $rootScope, Promise, mapFilter, indexPattern, getIndexPatternStub;

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

    beforeEach(function () {
      inject(function (_$rootScope_, _Promise_, Private) {
        Promise = _Promise_;
        $rootScope = _$rootScope_;

        mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        filterActions = Private(require('components/filter_bar/lib/filterActions'));

        getIndexPatternStub.returns(Promise.resolve(indexPattern));
      });
    });

    beforeEach(function (done) {
      var filters = [
        { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'foo' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'bar' } } } },
        { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
        { meta: { index: 'logstash-*', disabled: true }, missing: { field: 'host' } },
      ];

      Promise.map(filters, mapFilter)
      .then(function (filters) {
        $rootScope.state = { filters: filters };
        done();
      });
      $rootScope.$apply();
    });

    describe('addFilters', function () {
      var fn;
      var newFilters;

      beforeEach(function () {
        fn = filterActions($rootScope).addFilters;
        newFilters = [
          { meta: { index: 'logstash-*', apply: true }, query: { match: { 'extension': { query: 'baz' } } } },
          { meta: { index: 'logstash-*', apply: false }, query: { match: { 'extension': { query: 'buz' } } } },
          { meta: { index: 'logstash-*', disabled: true, apply: true }, missing: { field: 'geo.src' } },
        ];
      });

      it('should add only applied filters', function () {
        expect($rootScope.state.filters.length).to.be(4);
        fn(newFilters);
        expect($rootScope.state.filters.length).to.be(6);
        expect($rootScope.state.filters[4]).to.eql(newFilters[0]);
        expect($rootScope.state.filters[5]).to.eql(newFilters[2]);
      });

      it('should add filter object', function () {
        expect($rootScope.state.filters.length).to.be(4);
        var filter = newFilters[0];
        fn(filter);
        expect($rootScope.state.filters.length).to.be(5);
        expect($rootScope.state.filters[4]).to.eql(newFilters[0]);
      });

      it('should not add filters that are not applied', function () {
        expect($rootScope.state.filters.length).to.be(4);
        var filter = newFilters[1];
        fn(filter);
        expect($rootScope.state.filters.length).to.be(4);
      });
    });

  }];
});


