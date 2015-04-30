define(function (require) {
  return ['add filters', function () {
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

    describe('adding filters', function () {
      it('should add filters to appState', function () {
        queryFilter.addFilters(filters);
        expect(appState.filters.length).to.be(3);
        expect(globalState.filters.length).to.be(0);
      });

      it('should accept a single filter', function () {
        queryFilter.addFilters(filters[0]);
        expect(appState.filters.length).to.be(1);
        expect(globalState.filters.length).to.be(0);
      });

      it('should add filters to globalState', function () {
        queryFilter.addFilters(filters, true);
        expect(appState.filters.length).to.be(0);
        expect(globalState.filters.length).to.be(3);
      });
    });

    describe('filter reconciliation', function () {
      it('should de-dupe appState filters being added', function () {
        var newFilter = _.cloneDeep(filters[1]);
        appState.filters = filters;
        expect(appState.filters.length).to.be(3);

        queryFilter.addFilters(newFilter);
        $rootScope.$digest();
        expect(appState.filters.length).to.be(3);
      });

      it('should de-dupe globalState filters being added', function () {
        var newFilter = _.cloneDeep(filters[1]);
        globalState.filters = filters;
        expect(globalState.filters.length).to.be(3);

        queryFilter.addFilters(newFilter, true);
        $rootScope.$digest();
        expect(globalState.filters.length).to.be(3);
      });

      it('should mutate global filters on appState filter changes', function () {
        var idx = 1;
        globalState.filters = filters;
        var appFilter = _.cloneDeep(filters[idx]);
        appFilter.meta.negate = true;
        // use addFilters here, so custom adding logic can be applied
        queryFilter.addFilters(appFilter);

        var res = queryFilter.getFilters();
        expect(res).to.have.length(3);
        _.each(res, function (filter, i) {
          expect(filter.$state.store).to.be('globalState');
          // make sure global filter actually mutated
          expect(filter.meta.negate).to.be(i === idx);
        });
      });
    });
  }];
});
