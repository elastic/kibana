define(function (require) {
  return ['invert', function () {
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
        { meta: { index: 'logstash-*' }, query: { match: { 'extension': { query: 'jpg' } } } },
        { meta: { index: 'logstash-*', negate: true }, query: { match: { 'extension': { query: 'png' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
        { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
      ];

      Promise.map(filters, mapFilter)
      .then(function (filters) {
        $rootScope = { filters: filters };
      });
      $rootScope.$digest();
    });

    describe('invertFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).invertFilter;
      });

      it('should negate filter', function () {
        var filter = $rootScope.filters[0];
        expect(filter.meta).to.have.property('negate', false);
        filter = fn(filter);
        expect(filter.meta).to.have.property('negate', true);
      });

      it('should de-negate filter', function () {
        var filter = $rootScope.filters[1];
        expect(filter.meta).to.have.property('negate', true);
        filter = fn(filter);
        expect(filter.meta).to.have.property('negate', false);
      });
    });

    describe('invertAll', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).invertAll;
      });

      var pickNegated = function (filter) {
        return filter.meta.negate;
      };

      it('should toggle all the filters', function () {
        expect(_.filter($rootScope.filters, pickNegated)).to.have.length(1);
        fn();
        expect(_.filter($rootScope.filters, pickNegated)).to.have.length(4);
      });
    });
  }];
});
