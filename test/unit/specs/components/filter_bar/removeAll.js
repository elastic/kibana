define(function (require) {
  var removeAll = require('components/filter_bar/lib/removeAll');

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

    describe('removeAll', function () {
      it('should remove all the filters', function () {
        var fn = removeAll($rootScope);
        expect($rootScope.state.filters).to.have.length(4);
        fn();
        expect($rootScope.state.filters).to.have.length(0);
      });
    });

  });
});


