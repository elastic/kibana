define(function (require) {
  var _ = require('lodash');
  var MockState = require('fixtures/mock_state');
  var filterManager;
  var appState;

  describe('Filter Manager', function () {
    beforeEach(module('kibana'));

    beforeEach(function () {

      module('kibana/global_state', function ($provide) {
        $provide.service('getAppState', function () {
          return function () {
            return appState;
          };
        });
      });
    });

    beforeEach(function () {
      inject(function (Private) {
        filterManager = Private(require('components/filter_manager/filter_manager'));
        appState = new MockState();
        appState.filters = [];

        // mock queryFilter's invertFilter since it's used in the manager
        var queryFilter = Private(require('components/filter_bar/query_filter'));
        queryFilter.invertFilter = function (filter) {
          filter.meta.negate = !filter.meta.negate;
        };
      });
    });

    it('should have an `add` function', function () {
      expect(filterManager.add).to.be.a(Function);
    });

    it('should add a filter', function () {
      expect(appState.filters.length).to.be(0);
      filterManager.add('myField', 1, '+', 'myIndex');
      expect(appState.filters.length).to.be(1);
    });

    it('should add multiple filters if passed an array of values', function () {
      filterManager.add('myField', [1, 2, 3], '+', 'myIndex');
      expect(appState.filters.length).to.be(3);
    });

    it('should add an exists filter if _exists_ is used as the field', function () {
      filterManager.add('_exists_', 'myField', '+', 'myIndex');
      expect(appState.filters[0].exists).to.eql({field: 'myField'});
    });

    it('Should negate existing filter instead of added a conflicting filter', function () {
      filterManager.add('myField', 1, '+', 'myIndex');
      expect(appState.filters.length).to.be(1);
      filterManager.add('myField', 1, '-', 'myIndex');
      expect(appState.filters.length).to.be(1);
      expect(appState.filters[0].meta.negate).to.be(true);

      filterManager.add('_exists_', 'myField', '+', 'myIndex');
      expect(appState.filters.length).to.be(2);
      filterManager.add('_exists_', 'myField', '-', 'myIndex');
      expect(appState.filters.length).to.be(2);
      expect(appState.filters[1].meta.negate).to.be(true);
    });

    it('should enable matching filters being changed', function () {
      _.each([true, false], function (negate) {
        appState.filters = [{
          query: { match: { myField: { query: 1 } } },
          meta: { disabled: true, negate: negate }
        }];
        expect(appState.filters.length).to.be(1);
        expect(appState.filters[0].meta.disabled).to.be(true);

        filterManager.add('myField', 1, '+', 'myIndex');
        expect(appState.filters.length).to.be(1);
        expect(appState.filters[0].meta.disabled).to.be(false);
      });
    });
  });
});

