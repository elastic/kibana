define(function (require) {
  var removeFilter = require('components/filter_bar/lib/removeFilter');

  describe('Filter Bar Directive', function () {

    var $rootScope, $compile;

    beforeEach(function (done) {
      // load the application
      module('kibana');

      inject(function (_$rootScope_, _$compile_) {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $rootScope.state = {
          filters: [
            { query: { match: { '@tags': { query: 'test' } } } },
            { query: { match: { '@tags': { query: 'bar' } } } },
            { exists: { field: '@timestamp' } },
            { missing: { field: 'host' }, meta: { disabled: true } },
          ]
        };
        done();
      });

    });

    describe('removeFilter', function () {
      it('should remove the filter from the state', function () {
        var filter = $rootScope.state.filters[2];
        var fn = removeFilter($rootScope);
        fn(filter);
        expect($rootScope.state.filters).to.not.contain(filter);
      });
    });

  });
});


