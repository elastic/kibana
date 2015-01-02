define(function (require) {

  return ['remove', function () {
    var filterActions, $rootScope;

    beforeEach(function () {
      // load the application
      module('kibana');

      inject(function (_$rootScope_, Private) {
        $rootScope = _$rootScope_;
        filterActions = Private(require('components/filter_bar/lib/filterActions'));

        $rootScope.state = {
          filters: [
            { query: { match: { '@tags': { query: 'test' } } } },
            { query: { match: { '@tags': { query: 'bar' } } } },
            { exists: { field: '@timestamp' } },
            { missing: { field: 'host' }, meta: { disabled: true } },
          ]
        };
      });

    });

    describe('addFilters', function () {
      var fn;
      var newFilters;

      beforeEach(function () {
        fn = filterActions($rootScope).addFilters;
        newFilters = [
          { meta: { apply: true }, exists: { field: '_type' } },
          { meta: { apply: false }, query: { query_string: { query: 'foo:bar' } } },
          { meta: { apply: true }, query: { match: { 'extension': { query: 'jpg' } } } },
        ];
      });

      it('should add only applied filters', function () {
        expect($rootScope.state.filters.length).to.be(4);
        fn(newFilters);
        expect($rootScope.state.filters.length).to.be(6);
        expect($rootScope.state.filters[4]).to.eql(newFilters[0]);
        expect($rootScope.state.filters[5]).to.eql(newFilters[2]);
      });

      it('should add filter object', function () {
        expect($rootScope.state.filters.length).to.be(4);
        var filter = newFilters[0];
        fn(filter);
        expect($rootScope.state.filters.length).to.be(5);
        expect($rootScope.state.filters[4]).to.eql(newFilters[0]);
      });

      it('should not add filter that are not applied', function () {
        expect($rootScope.state.filters.length).to.be(4);
        var filter = newFilters[1];
        fn(filter);
        expect($rootScope.state.filters.length).to.be(4);
      });
    });

  }];
});


