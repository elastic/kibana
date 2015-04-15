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

      it('should set pinned state from false to true and append', function () {
        var filter = $rootScope.filters[1];
        var filterCount = $rootScope.filters.length;

        expect(filter.meta.pinned).to.be(false);
        filter = fn(filter);
        expect(filter.meta.pinned).to.be(true);
        // should also duplicate filter as pinned
        expect($rootScope.filters.length).to.be(filterCount + 1);
      });

      it('should set pinned state from true to false and de-dupe', function () {
        var filter = $rootScope.filters[0];
        var filterCount = $rootScope.filters.length;
        var dupeFilter = _.cloneDeep(filter);
        dupeFilter.meta.pinned = false;

        $rootScope.filters.push(dupeFilter);
        expect($rootScope.filters.length).to.be(filterCount + 1);

        expect(filter.meta.pinned).to.be(true);
        filter = fn(filter);
        expect(filter.meta.pinned).to.be(false);
        // check that the 2 now-unpinned filters are de-duped
        expect($rootScope.filters.length).to.be(filterCount);
      });

      it('should force pin filter to true', function () {
        var filter = $rootScope.filters[0];

        expect(filter.meta.pinned).to.be(true);
        filter = fn(filter, true);
        expect(filter.meta.pinned).to.be(true);

        filter = $rootScope.filters[1];

        expect(filter.meta.pinned).to.be(false);
        filter = fn(filter, true);
        expect(filter.meta.pinned).to.be(true);
      });

      it('should force pin filter to false', function () {
        var filter = $rootScope.filters[0];

        expect(filter.meta.pinned).to.be(true);
        filter = fn(filter, false);
        expect(filter.meta.pinned).to.be(false);

        filter = $rootScope.filters[1];

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
        var filterCount = $rootScope.filters.length;
        var unfilteredCount = _.filter($rootScope.filters, { meta: { pinned: false }}).length;
        fn(true);
        var pinned = _.filter($rootScope.filters, { meta: { pinned: true }});
        // all existing filters were pinned
        expect(pinned.length).to.be(filterCount);
        // all previously unpinned filters were duplicated
        expect($rootScope.filters.length).to.be(filterCount + unfilteredCount);
      });

      it('should unpin all filters from global state', function () {
        var filterCount = $rootScope.filters.length;
        fn(false);
        var unpinned = _.filter($rootScope.filters, { meta: { pinned: false }});
        // all filters were unpinned, no duplicates remain
        expect(unpinned.length).to.be(filterCount);
      });
    });

  }];
});


