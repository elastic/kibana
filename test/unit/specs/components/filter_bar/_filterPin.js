define(function (require) {
  return ['pin', function () {
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

    beforeEach(function () {
      var filters = [
        { meta: { index: 'logstash-*', pinned: true }, query: { match: { 'extension': { query: 'jpg' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
        { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
      ];

      Promise.map(filters, mapFilter)
      .then(function (filters) {
        $rootScope.filters = filters;
      });
      $rootScope.$digest();
    });

    describe('pinFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).pinFilter;
      });

      it('should set pinned state to true', function () {
        var filter = $rootScope.filters[1];

        expect(filter.meta.pinned).to.be(false);
        filter = fn(filter);
        expect(filter.meta.pinned).to.be(true);
      });

      it('should set pinned state to false', function () {
        var filter = $rootScope.filters[0];

        expect(filter.meta.pinned).to.be(true);
        filter = fn(filter);
        expect(filter.meta.pinned).to.be(false);
      });

      it('should force pin filter to true', function () {
        var filter = $rootScope.filters[0];

        expect(filter.meta.pinned).to.be(true);
        filter = fn(filter, true);
        expect(filter.meta.pinned).to.be(true);
      });

      it('should force pin filter to false', function () {
        var filter = $rootScope.filters[1];

        expect(filter.meta.pinned).to.be(false);
        filter = fn(filter, false);
        expect(filter.meta.pinned).to.be(false);
      });
    });

    describe('pinAll', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).pinAll;
      });

      it('should pin all filters to global state', function () {
        fn(true);
        var pinned = _.filter($rootScope.filters, { meta: { pinned: true }});
        expect(pinned.length).to.be($rootScope.filters.length);
      });

      it('should unpin all filters from global state', function () {
        fn(false);
        var pinned = _.filter($rootScope.filters, { meta: { pinned: false }});
        expect(pinned.length).to.be($rootScope.filters.length);
      });
    });

  }];
});


