/* global sinon */
define(function (require) {
  return ['toggle', function () {
    var _ = require('lodash');
    var filterActions, mapFilter, $rootScope, Promise, getIndexPatternStub, indexPattern;

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

    beforeEach(inject(function (_Promise_, _$rootScope_, Private) {
      Promise = _Promise_;
      $rootScope = _$rootScope_;
      filterActions = Private(require('components/filter_bar/lib/filterActions'));
      mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

      getIndexPatternStub.returns(Promise.resolve(indexPattern));

      $rootScope.state = {
        filters: [
          { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
          { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
          { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
          { meta: { index: 'logstash-*', disabled: true }, missing: { field: 'host' } },
        ]
      };
    }));

    describe('toggleFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).toggleFilter;
      });

      it('should toggle filters on and off', function (done) {
        var filter = $rootScope.state.filters[0];
        mapFilter(filter).then(fn).then(function (result) {
          expect(result.meta).to.have.property('disabled', true);
          done();
        });
        $rootScope.$apply();
      });
    });

    describe('toggleAll', function () {
      var fn;

      beforeEach(function (done) {
        var _filters = _($rootScope.state.filters)
          .filter(function (filter) { return filter; })
          .flatten(true)
          .value();

        Promise.map(_filters, mapFilter).then(function (filters) {
          $rootScope.filters = filters;
          done();
        });
        $rootScope.$apply();
      });

      beforeEach(function () {
        fn = filterActions($rootScope).toggleAll;
      });

      var pickDisabled = function (filter) {
        return filter.meta.disabled;
      };

      it('should toggle all the filters', function () {
        expect(_.filter($rootScope.state.filters, pickDisabled)).to.have.length(1);
        fn();
        expect(_.filter($rootScope.state.filters, pickDisabled)).to.have.length(3);
      });

      it('should disable all the filters', function () {
        expect(_.filter($rootScope.state.filters, pickDisabled)).to.have.length(1);
        fn(true);
        expect(_.filter($rootScope.state.filters, pickDisabled)).to.have.length(4);
      });

      it('should enable all the filters', function () {
        expect(_.filter($rootScope.state.filters, pickDisabled)).to.have.length(1);
        fn(false);
        expect(_.filter($rootScope.state.filters, pickDisabled)).to.have.length(0);
      });
    });
  }];
});



