define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');

  // Load the kibana app dependencies.
  require('angular-route');

  require('plugins/discover/index');

  var $parentScope, $scope, $elem;

  var init = function () {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function ($rootScope, $compile) {

      // Give us a scope
      $parentScope = $rootScope;

      // Create the element
      $elem = angular.element(
        '<span class="spinner"></span>'
      );

      // And compile it
      $compile($elem)($parentScope);

      // Fire a digest cycle
      $elem.scope().$digest();

      // Grab the isolate scope so we can test it
      $scope = $elem.isolateScope();
    });
  };


  describe('spinner directive', function () {

    beforeEach(function () {
      init();
    });

    it('should contain 3 divs', function (done) {
      expect($elem.children('div').length).to.be(3);
      done();
    });

  });

});
