define(function (require) {
  var angular = require('angular');
  var mocks = require('angular-mocks');
  var _ = require('lodash');
  var $ = require('jquery');
  var sinon = require('sinon/sinon');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the modules
  require('apps/dashboard/index');

  // Create the kibana module
  require('./mocks/modules.js');


  describe('Mapper', function () {
    var $scope;

    beforeEach(function () {

      // Start the kibana module
      module('kibana');

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