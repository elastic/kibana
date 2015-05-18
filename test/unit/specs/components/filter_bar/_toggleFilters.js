define(function (require) {
  return ['toggle filters', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var MockState = require('fixtures/mock_state');
    var storeNames = {
      app: 'appState',
      global: 'globalState'
    };
    var filters;
    var queryFilter;
    var $rootScope, getIndexPatternStub, appState, globalState;

    beforeEach(module('kibana'));

    beforeEach(function () {
      appState = new MockState({ filters: [] });
      globalState = new MockState({ filters: [] });

      filters = [
        {
          query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
          meta: { negate: false, disabled: false }
        },
        {
          query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
          meta: { negate: false, disabled: false }
        },
        {
          query: { match: { '_type': { query: 'nginx', type: 'phrase' } } },
          meta: { negate: false, disabled: false }
        }
      ];
    });

    beforeEach(function () {
      module('kibana/global_state', function ($provide) {
        $provide.service('courier', function () {
          var courier = { indexPatterns: { get: getIndexPatternStub } };
          return courier;
        });

        $provide.service('getAppState', function () {
          return function () {
            return appState;
          };
        });

        $provide.service('globalState', function () {
          return globalState;
        });
      });
    });

    beforeEach(function () {
      getIndexPatternStub = sinon.stub();

      inject(function (_$rootScope_, Private, Promise) {
        var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        getIndexPatternStub.returns(Promise.resolve(indexPattern));
        $rootScope = _$rootScope_;
        queryFilter = Private(require('components/filter_bar/query_filter'));
      });
    });

    describe('toggling a filter', function () {
      it('should toggle the disabled property in appState', function () {
        _.each(filters, function (filter) {
          expect(filter.meta.disabled).to.be(false);
          appState.filters.push(filter);
        });

        queryFilter.toggleFilter(filters[1]);
        expect(appState.filters[1].meta.disabled).to.be(true);
      });

      it('should toggle the disabled property in globalState', function () {
        _.each(filters, function (filter) {
          expect(filter.meta.disabled).to.be(false);
          globalState.filters.push(filter);
        });

        queryFilter.toggleFilter(filters[1]);
        expect(globalState.filters[1].meta.disabled).to.be(true);
      });

      it('should fire the update and fetch events', function () {
        var emitSpy = sinon.spy(queryFilter, 'emit');
        appState.filters = filters;
        $rootScope.$digest();

        queryFilter.toggleFilter(filters[1]);
        $rootScope.$digest();

        expect(emitSpy.callCount).to.be(2);
        expect(emitSpy.firstCall.args[0]).to.be('update');
        expect(emitSpy.secondCall.args[0]).to.be('fetch');
      });

      it('should always enable the filter', function () {
        appState.filters = filters.map(function (filter) {
          filter.meta.disabled = true;
          return filter;
        });

        expect(appState.filters[1].meta.disabled).to.be(true);
        queryFilter.toggleFilter(filters[1], false);
        expect(appState.filters[1].meta.disabled).to.be(false);
        queryFilter.toggleFilter(filters[1], false);
        expect(appState.filters[1].meta.disabled).to.be(false);
      });

      it('should always disable the filter', function () {
        globalState.filters = filters;

        expect(globalState.filters[1].meta.disabled).to.be(false);
        queryFilter.toggleFilter(filters[1], true);
        expect(globalState.filters[1].meta.disabled).to.be(true);
        queryFilter.toggleFilter(filters[1], true);
        expect(globalState.filters[1].meta.disabled).to.be(true);

      });
    });

    describe('bulk toggling', function () {
      beforeEach(function () {
        appState.filters = filters;
        globalState.filters = _.map(_.cloneDeep(filters), function (filter) {
          filter.meta.disabled = true;
          return filter;
        });
      });

      it('should swap the enabled state for all filters', function () {
        queryFilter.toggleAll();
        _.each(appState.filters, function (filter) {
          expect(filter.meta.disabled).to.be(true);
        });
        _.each(globalState.filters, function (filter) {
          expect(filter.meta.disabled).to.be(false);
        });
      });

      it('should enable all filters', function () {
        queryFilter.toggleAll(true);
        _.each(appState.filters, function (filter) {
          expect(filter.meta.disabled).to.be(true);
        });
        _.each(globalState.filters, function (filter) {
          expect(filter.meta.disabled).to.be(true);
        });
      });

      it('should disable all filters', function () {
        queryFilter.toggleAll(false);
        _.each(appState.filters, function (filter) {
          expect(filter.meta.disabled).to.be(false);
        });
        _.each(globalState.filters, function (filter) {
          expect(filter.meta.disabled).to.be(false);
        });
      });
    });
  }];
});
