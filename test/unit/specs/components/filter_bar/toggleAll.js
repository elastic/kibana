/* global sinon */
define(function (require) {

  var _ = require('lodash');
  var toggleAll = require('components/filter_bar/lib/toggleAll');
  describe('Filter Bar Directive', function () {

    var mapFilter, $rootScope, $compile, Promise, getIndexPatternStub, indexPattern;
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

    beforeEach(inject(function (_Promise_, _$rootScope_, _$compile_, Private) {
      Promise = _Promise_;
      mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      getIndexPatternStub.returns(Promise.resolve(indexPattern));
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $rootScope.state = {
        filters: [
          { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
          { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
          { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
          { meta: { index: 'logstash-*', disabled: true }, missing: { field: 'host' } },
        ]
      };
    }));

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
        fn = toggleAll($rootScope);
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

  });
});



