define(function (require) {
  return ['remove filters', function () {
    var _ = require('lodash');
    var MockState = require('fixtures/mock_state');
    var storeNames = {
      app: 'appState',
      global: 'globalState'
    };
    var filters;
    var queryFilter;
    var $rootScope, appState, globalState;

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
      inject(function (_$rootScope_, Private) {
        $rootScope = _$rootScope_;
        queryFilter = Private(require('components/filter_bar/query_filter'));
      });
    });

    describe('removing a filter', function () {
      it('should remove the filter from appState', function () {
        appState.filters = filters;
        expect(appState.filters).to.have.length(3);
        queryFilter.removeFilter(filters[0]);
        expect(appState.filters).to.have.length(2);
      });

      it('should remove the filter from globalState', function () {
        globalState.filters = filters;
        expect(globalState.filters).to.have.length(3);
        queryFilter.removeFilter(filters[0]);
        expect(globalState.filters).to.have.length(2);
      });

      it('should only remove matching instances', function () {
        globalState.filters.push(filters[0]);
        globalState.filters.push(filters[1]);
        appState.filters.push(filters[2]);

        queryFilter.removeFilter(_.cloneDeep(filters[0]));
        expect(globalState.filters).to.have.length(2);
        expect(appState.filters).to.have.length(1);

        queryFilter.removeFilter(_.cloneDeep(filters[2]));
        expect(globalState.filters).to.have.length(2);
        expect(appState.filters).to.have.length(1);
      });
    });

    describe('bulk removal', function () {
      it('should remove all the filters from both states', function () {
        globalState.filters.push(filters[0]);
        globalState.filters.push(filters[1]);
        appState.filters.push(filters[2]);
        expect(globalState.filters).to.have.length(2);
        expect(appState.filters).to.have.length(1);

        queryFilter.removeAll();
        expect(globalState.filters).to.have.length(0);
        expect(appState.filters).to.have.length(0);
      });
    });
  }];
});
