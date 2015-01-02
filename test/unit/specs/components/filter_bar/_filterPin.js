/* global sinon */
define(function (require) {
  return ['pin', function () {
    var _ = require('lodash');
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

        $rootScope.state = {
          filters: [
            { meta: { index: 'logstash-*', pinned: true }, query: { match: { 'extension': { query: 'jpg' } } } },
            { meta: { index: 'logstash-*', negate: true, pinned: true }, query: { match: { 'extension': { query: 'png' } } } },
            { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
            { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
            { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
          ]
        };
      });
    });

    describe('pinFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).pinFilter;
      });

      it('should set pinned state and append to global state', function (done) {
        var filter = $rootScope.state.filters[2];

        mapFilter(filter)
        .then(function (result) {
          expect(result.meta.pinned).to.be(false);
          expect(globalStateStub.filters.length).to.be(2);
          return result;
        })
        .then(fn)
        .then(function (result) {
          expect(result.meta.pinned).to.be(true);
          expect(globalStateStub.filters.length).to.be(3);
          done();
        });
        $rootScope.$apply();
      });

      it('should unpin filter from global state', function (done) {
        var filter = $rootScope.state.filters[0];

        mapFilter(filter)
        .then(function (result) {
          expect(result.meta.pinned).to.be(true);
          expect(globalStateStub.filters.length).to.be(2);
          return result;
        })
        .then(fn)
        .then(function (result) {
          expect(result.meta.pinned).to.be(false);
          expect(globalStateStub.filters.length).to.be(1);
          done();
        });
        $rootScope.$apply();
      });

      it('should force pin filter to global state', function (done) {
        var filter = $rootScope.state.filters[0];

        mapFilter(filter)
        .then(function (result) {
          expect(result.meta.pinned).to.be(true);
          expect(globalStateStub.filters.length).to.be(2);
          return fn(result, true);
        })
        .then(function (result) {
          expect(result.meta.pinned).to.be(true);
          expect(globalStateStub.filters.length).to.be(2);
          done();
        });
        $rootScope.$apply();
      });

      it('should force unpin filter from global state', function (done) {
        var filter = $rootScope.state.filters[2];

        mapFilter(filter)
        .then(function (result) {
          expect(result.meta.pinned).to.be(false);
          expect(globalStateStub.filters.length).to.be(2);
          return fn(result, false);
        })
        .then(function (result) {
          expect(result.meta.pinned).to.be(false);
          expect(globalStateStub.filters.length).to.be(2);
          done();
        });
        $rootScope.$apply();
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


