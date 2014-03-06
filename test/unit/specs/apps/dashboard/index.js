define(function (require) {
  var mocks = require('angular-mocks');
  var _ = require('lodash');
  var $ = require('jquery');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the modules
  require('apps/dashboard/index');

  describe('Mapper', function () {
    var $scope;

    beforeEach(function () {
      module('app/dashboard');

      // Create the scope
      inject(function ($rootScope, $controller) {
        $scope = $rootScope.$new();
        var dashCtrl = $controller('dashboard', {
          $scope: $scope
        });

      // $scope is now available in tests
      });

    });

    it('should attach $routeParams to scope', function (done) {
      expect($scope.routeParams).to.be.a(Object);
      done();
    });

    it('should have called init and attached some properties', function (done) {
      expect($scope.gridControl).to.be.a(Object);
      expect($scope.input.search).to.be('');
      expect($scope.configurable.dashboard).to.be.a(Object);
      done();
    });

  });

});