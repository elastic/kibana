define(function (require) {

  return ['remove', function () {
    var filterActions = require('components/filter_bar/lib/filterActions');
    var $rootScope;

    beforeEach(function () {
      // load the application
      module('kibana');

      inject(function (_$rootScope_, _$compile_) {
        $rootScope = _$rootScope_;
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

    describe('removeFilter', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).removeFilter;
      });

      it('should remove the filter from the state', function () {
        var filter = $rootScope.state.filters[2];
        fn(filter);
        expect($rootScope.state.filters).to.not.contain(filter);
      });
    });

    describe('removeAll', function () {
      var fn;

      beforeEach(function () {
        fn = filterActions($rootScope).removeAll;
      });

      it('should remove all the filters', function () {
        expect($rootScope.state.filters).to.have.length(4);
        fn();
        expect($rootScope.state.filters).to.have.length(0);
      });
    });
  }];
});


