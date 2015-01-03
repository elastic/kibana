define(function (require) {
  return ['pin', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var filterActions, $rootScope, Promise, mapFilter, indexPattern, getIndexPatternStub, globalStateStub;

    beforeEach(module('kibana'));

    beforeEach(function () {
      getIndexPatternStub = sinon.stub();
      module('kibana/courier', function ($provide) {
        $provide.service('courier', function () {
          var courier = { indexPatterns: { get: getIndexPatternStub } };
          return courier;
        });

        $provide.service('globalState', function () {
          globalStateStub = {};
          globalStateStub.on = globalStateStub.off = _.noop;
          globalStateStub.save = sinon.stub();

          return globalStateStub;
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
        { meta: { index: 'logstash-*', pinned: true }, query: { match: { 'extension': { query: 'jpg' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
        { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
      ];

      globalStateStub.filters = [
        { meta: { index: 'logstash-*', pinned: true }, query: { match: { '@tags': { query: 'test1' } } } },
        { meta: { index: 'logstash-*', negate: true, pinned: true }, query: { match: { 'extension': { query: 'png' } } } },
        { meta: { index: 'logstash-*', negate: true, pinned: true }, query: { match: { 'response': { query: '200' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'test3' } } } }
      ];

      Promise.map(filters, mapFilter)
      .then(function (filters) {
        $rootScope.state = { filters: filters };
        done();
      });
      $rootScope.$apply();
    });

    describe('global state', function () {
      it('should only load unpinned filters from app state', function () {
        globalStateStub.filters = [];
        expect($rootScope.state.filters.length).to.be(3);
        var actions = filterActions($rootScope);
        expect($rootScope.filters.length).to.be(2);
      });

      it('should only load pinned filters from global state', function () {
        expect($rootScope.state.filters.length).to.be(3);
        var actions = filterActions($rootScope);
        // 2 unpinned in scope state, 3 pinned in global state
        expect($rootScope.state.filters.length).to.be(5);
      });
    });

    describe('pinFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).pinFilter;
      });

      it('should set pinned state and append to global state', function () {
        var filter = $rootScope.state.filters[0];

        expect(filter.meta.pinned).to.be(false);
        expect(globalStateStub.filters.length).to.be(3);

        filter = fn(filter);

        expect(filter.meta.pinned).to.be(true);
        expect(globalStateStub.filters.length).to.be(4);
      });

      it('should unpin filter from global state', function () {
        var filter = globalStateStub.filters[0];

        expect(filter.meta.pinned).to.be(true);
        expect(globalStateStub.filters.length).to.be(3);

        filter = fn(filter);

        expect(filter.meta.pinned).to.be(false);
        expect(globalStateStub.filters.length).to.be(2);
      });

      it('should force pin filter to global state', function () {
        var filter = globalStateStub.filters[0];

        expect(filter.meta.pinned).to.be(true);
        expect(globalStateStub.filters.length).to.be(3);

        filter = fn(filter, true);

        expect(filter.meta.pinned).to.be(true);
        expect(globalStateStub.filters.length).to.be(3);
      });

      it('should force unpin filter from global state', function () {
        var filter = $rootScope.state.filters[0];

        expect(filter.meta.pinned).to.be(false);
        expect(globalStateStub.filters.length).to.be(3);

        filter = fn(filter, false);

        expect(filter.meta.pinned).to.be(false);
        expect(globalStateStub.filters.length).to.be(3);
      });
    });

    describe('pinAll', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).pinAll;
      });

      it('should pin all filters to global state', function () {
        fn(true);
        var pinned = _.filter($rootScope.state.filters, { meta: { pinned: true }});
        expect(pinned.length).to.be($rootScope.state.filters.length);
      });

      it('should unpin all filters from global state', function () {
        fn(false);
        var pinned = _.filter($rootScope.state.filters, { meta: { pinned: false }});
        expect(pinned.length).to.be($rootScope.state.filters.length);
      });
    });

  }];
});


