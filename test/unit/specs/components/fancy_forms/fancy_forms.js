define(function (require) {
  var $ = require('jquery');

  describe('fancy forms', function () {
    var $baseEl = $('<form>').append(
      $('<input ng-model="val" required>')
    );

    var $el;
    var $scope;
    var $compile;
    var $rootScope;
    var ngForm;
    var ngModel;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');

      $scope = $rootScope.$new();
      $el = $baseEl.clone();

      $compile($el)($scope);
      $scope.$apply();

      ngForm = $el.controller('form');
      ngModel = $el.find('input').controller('ngModel');
    }));

    describe('ngFormController', function () {
      it('counts errors', function () {
        expect(ngForm.errorCount()).to.be(1);
      });

      it('clears errors', function () {
        $scope.val = 'someting';
        $scope.$apply();
        expect(ngForm.errorCount()).to.be(0);
      });

      it('describes 0 errors', function () {
        $scope.val = 'someting';
        $scope.$apply();
        expect(ngForm.describeErrors()).to.be('0 Errors');
      });

      it('describes 1 error', function () {
        $scope.$apply();
        expect(ngForm.describeErrors()).to.be('1 Error');
      });
    });

    describe('ngModelController', function () {
      it('gives access to the ngFormController', function () {
        expect(ngModel.$getForm()).to.be(ngForm);
      });

      it('allows setting the model dirty', function () {
        expect($el.find('input.ng-dirty')).to.have.length(0);
        ngModel.$setDirty();
        expect($el.find('input.ng-dirty')).to.have.length(1);
      });

      it('sets the model dirty when it moves from valid to invalid', function () {
        // clear out the old scope/el
        $scope.$destroy();
        $el = $baseEl.clone();
        $scope = $rootScope.$new();

        // start with a valid value
        $scope.val = 'something';
        $compile($el)($scope);
        $rootScope.$apply();

        // ensure that the field is valid and pristinve
        var $valid = $el.find('input.ng-valid');
        expect($valid).to.have.length(1);
        expect($valid.hasClass('ng-pristine')).to.be(true);
        expect($valid.hasClass('ng-dirty')).to.be(false);

        // remove the value without actually setting the view model
        $scope.val = null;
        $rootScope.$apply();

        // ensure that the field is now invalid and dirty
        var $invalid = $el.find('input.ng-invalid');
        expect($invalid).to.have.length(1);
        expect($valid.hasClass('ng-pristine')).to.be(false);
        expect($valid.hasClass('ng-dirty')).to.be(true);
      });
    });
  });
});