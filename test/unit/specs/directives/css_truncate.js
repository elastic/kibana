define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');

  require('angular-route');
  require('plugins/discover/index');

  var $parentScope, $scope, $elem;

  var init = function (expandable) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function ($rootScope, $compile) {

      // Give us a scope
      $parentScope = $rootScope;

      // Create the element
      $elem = angular.element(
        '<span css-truncate ' + (expandable ? 'css-truncate-expandable' : '') + '>this isnt important</span>'
      );

      // And compile it
      $compile($elem)($parentScope);

      // Fire a digest cycle
      $elem.scope().$digest();

      // Grab the isolate scope so we can test it
      $scope = $elem.isolateScope();
    });
  };


  describe('cssTruncate directive', function () {

    describe('expandable', function () {

      beforeEach(function () {
        init(true);
      });

      it('should set text-overflow to ellipsis and whitespace to nowrap', function (done) {
        expect($elem.css('text-overflow')).to.be('ellipsis');
        expect($elem.css('white-space')).to.be('nowrap');
        done();
      });

      it('should set white-space to normal when clicked, and back to nowrap when clicked again', function (done) {
        $scope.toggle();
        expect($elem.css('white-space')).to.be('normal');

        $scope.toggle();
        expect($elem.css('white-space')).to.be('nowrap');
        done();
      });

    });

  });

});
