define(function (require) {
  return ['editing filters', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    var MockState = require('fixtures/mock_state');
    var filters, filter;
    var queryFilter;
    var $rootScope, appState, globalState;

    beforeEach(module('kibana'));

    beforeEach(function () {
      appState = new MockState({ filters: [] });
      globalState = new MockState({ filters: [] });

      filters = [
        {
          query: { match: { extension: { query: 'gif', type: 'phrase' } } },
          meta: { negate: false, disabled: false }
        },
      ];

      filter = filters[0];
    });

    beforeEach(function () {
      module('kibana/courier', function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      });

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

    describe('change editing state', function () {
      it('should be able to start editing a filter', function () {
        queryFilter.startEditingFilter(filter);
        expect(filter.meta.editing).to.be(true);
      });

      it('should be able to stop editing a filter', function () {
        queryFilter.stopEditingFilter(filter);
        expect(filter.meta.editing).to.be(undefined);
      });
    });

    describe('edit query', function () {
      it('should stringify the current state', function () {
        var stringifiedQuery = queryFilter.stringifyQuery(filter);
        expect(typeof stringifiedQuery).to.be('string');
        expect(_.isEqual(JSON.parse(stringifiedQuery), filter.query.match)).to.be(true);
      });

      it('should merge stringified query changes', function () {
        var clonedFilter = _.cloneDeep(filter);
        clonedFilter.query.match.extension.query = 'jpg';
        expect(_.isEqual(clonedFilter, filter)).to.be(false);
        queryFilter.mergeEditedFilter(filter, JSON.stringify(clonedFilter.query.match));
        expect(_.isEqual(clonedFilter, filter)).to.be(true);
      });
    });
  }];
});
