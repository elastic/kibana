define(function (require) {
  var _ = require('lodash');
  var filterActions = require('components/filter_bar/lib/filterActions');
  var $rootScope;

  describe('Filter Bar Actions', function () {
    beforeEach(module('kibana'));

    beforeEach(function () {
      inject(function (_$rootScope_) {
        $rootScope = _$rootScope_;
      });
    });

    describe('apply', function () {
      it('should apply methods to scope', function () {
        var methods = _.filter(_.keys(filterActions($rootScope)), function (method) {
          return method !== 'apply';
        });

        filterActions($rootScope).apply();

        _.each(methods, function (method) {
          expect($rootScope).to.have.property(method);
        });
      });
    });
  });

  describe.only('Filter Bar Actions', function () {
    var childSuites = [
      require('specs/components/filter_bar/_filterToggle'),
      require('specs/components/filter_bar/_filterRemove'),
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  });
});
