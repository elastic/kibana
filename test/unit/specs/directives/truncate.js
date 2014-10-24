define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');

  // Load the kibana app dependencies.
  require('angular-route');

  require('plugins/discover/index');

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
        '<kbn-truncated orig="' + text + '" length="10"></kbn-timepicker>'
      );

      // And compile it
      $compile($elem)($parentScope);

      // Fire a digest cycle
      $elem.scope().$digest();

      // Grab the isolate scope so we can test it
      $scope = $elem.isolateScope();
    });
  };


  describe('kbnTruncate directive', function () {

    describe('long strings', function () {

      beforeEach(function () {
        init('some string of text over 10 characters');
      });

      it('should trim long strings', function (done) {
        expect($elem.text()).to.be('some strin... more');
        done();
      });

      it('should have a link to see more text', function (done) {
        expect($elem.find('[ng-click="toggle()"]').text()).to.be('more');
        done();
      });

      it('should should more text if the link is clicked and less text if clicked again', function (done) {
        $scope.toggle();
        $scope.$digest();
        expect($elem.text()).to.be('some string of text over 10 characters less');
        expect($elem.find('[ng-click="toggle()"]').text()).to.be('less');

        $scope.toggle();
        $scope.$digest();
        expect($elem.text()).to.be('some strin... more');
        expect($elem.find('[ng-click="toggle()"]').text()).to.be('more');

        done();
      });

    });

    describe('short strings', function () {

      beforeEach(function () {
        init('short');
      });

      it('should not trim short strings', function (done) {
        expect($elem.text()).to.be('short');
        done();
      });

      it('should not have a link', function (done) {
        expect($elem.find('[ng-click="toggle()"]').length).to.be(0);
        done();
      });

    });

  });

});
