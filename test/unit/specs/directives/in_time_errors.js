define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');

  require('directives/in_time_errors');


  var $parentScope, $scope, $elem;

  var init = function (text) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function ($rootScope, $compile) {

      // Give us a scope
      $parentScope = $rootScope;

      // Create the element
      $elem = angular.element(
        '<form class="in-time-errors" name="testForm"><input type="text" required /></form>'
      );

      // And compile it
      $compile($elem)($parentScope);

      // Fire a digest cycle
      $elem.scope().$digest();

      // Grab the isolate scope so we can test it
      $scope = $elem.scope();
    });
  };

  describe('In time errors Directives', function () {
    beforeEach(function () {
      init();
    });

    it('should not allow the red border on input after first compile', function () {
      expect($elem.hasClass('ng-invalid')).to.be(true);
      expect($elem.attr('border-color')).to.be('#e74c3c');
    });
    it('should add a flag that shows whether or not it\'s showing errors', function () {
      expect($scope.testForm.hideErrors).to.be(true);
    });
    it('should show errors after the first submit', function () {
      $elem.submit();
      expect($elem.attr('border-color')).to.be('#e74c3c');
    });
  });

});
