define(function (require) {
  describe('PercentList directive', function () {
    var $ = require('jquery');
    var _ = require('lodash');

    require('components/agg_types/controls/_percent_list');

    var $el;
    var $scope;
    var $compile;
    var $rootScope;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');

      $el = $('<input>').attr('ng-model', 'val').attr('percent-list', '');
      $scope = $rootScope.$new();
    }));

    afterEach(function () {
      $el.remove();
      $scope.$destroy();
    });

    it('filters out empty entries', function () {
      $compile($el)($scope);

      $el.val(',,1,     ,, ,2, ,\n,');
      $el.change();
      expect($scope.val).to.eql([1, 2]);
    });

    it('fails on invalid numbers', function () {
      $compile($el)($scope);

      $el.val('foo,bar');
      $el.change();
      expect($scope.val).to.be(undefined);
      expect($el.hasClass('ng-invalid')).to.be(true);
    });

    it('supports decimals', function () {
      $compile($el)($scope);

      $el.val('1.2,000001.6,99.10');
      $el.change();
      expect($scope.val).to.eql([1.2, 1.6, 99.10]);
    });

    it('ensures that the values are in order', function () {
      $compile($el)($scope);

      $el.val('1, 2, 3, 10, 4, 5');
      $el.change();
      expect($scope.val).to.be(undefined);
      expect($el.hasClass('ng-invalid')).to.be(true);
    });

    it('ensures that the values are less between 0 and 100', function () {
      $compile($el)($scope);

      $el.val('-1, 0, 1');
      $el.change();
      expect($scope.val).to.be(undefined);
      expect($el.hasClass('ng-invalid')).to.be(true);

      $el.val('0, 1');
      $el.change();
      expect($scope.val).to.eql([0, 1]);
      expect($el.hasClass('ng-invalid')).to.be(false);

      $el.val('1, 101');
      $el.change();
      expect($scope.val).to.be(undefined);
      expect($el.hasClass('ng-invalid')).to.be(true);
    });
  });
});