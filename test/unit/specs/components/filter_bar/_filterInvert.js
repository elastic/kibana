/* global sinon */
define(function (require) {
  return ['invert', function () {
    var _ = require('lodash');
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

        $rootScope.state = {
          filters: [
            { meta: { index: 'logstash-*' }, query: { match: { 'extension': { query: 'jpg' } } } },
            { meta: { index: 'logstash-*', negate: true }, query: { match: { 'extension': { query: 'png' } } } },
            { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
            { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
            { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
          ]
        };
      });
    });

    describe('invertFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).invertFilter;
      });

      it('should negate filter', function (done) {
        var filter = $rootScope.state.filters[0];
        mapFilter(filter)
        .then(function (result) {
          expect(result.meta).to.have.property('negate', false);
          return result;
        })
        .then(fn)
        .then(function (result) {
          expect(result.meta).to.have.property('negate', true);
          done();
        });
        $rootScope.$apply();
      });

      it('should de-negate filter', function (done) {
        var filter = $rootScope.state.filters[1];
        mapFilter(filter)
        .then(function (result) {
          expect(result.meta).to.have.property('negate', true);
          return result;
        })
        .then(fn)
        .then(function (result) {
          expect(result.meta).to.have.property('negate', false);
          done();
        });
        $rootScope.$apply();
      });
    });

    describe('invertAll', function () {
      var fn;

      beforeEach(function (done) {
        Promise.map($rootScope.state.filters, mapFilter).then(function (filters) {
          $rootScope.filters = filters;
          done();
        });
        $rootScope.$apply();
      });

      beforeEach(function () {
        fn = filterActions($rootScope).invertAll;
      });

      var pickNegated = function (filter) {
        return filter.meta.negate;
      };

      it('should toggle all the filters', function () {
        expect(_.filter($rootScope.state.filters, pickNegated)).to.have.length(1);
        fn();
        expect(_.filter($rootScope.state.filters, pickNegated)).to.have.length(4);
      });
    });
  }];
});


