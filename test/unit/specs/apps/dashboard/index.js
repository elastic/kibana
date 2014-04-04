define(function (require) {
  var mocks = require('angular-mocks');
  var _ = require('lodash');
  var $ = require('jquery');
  var sinon = require('test_utils/auto_release_sinon');


  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the modules
  require('apps/dashboard/index');

  describe('Dashboard app', function () {
    var $scope,
      location;

    beforeEach(function () {
      module('app/dashboard');

      // Create the scope
      inject(function ($rootScope, $controller, $location) {
        $scope = $rootScope.$new();
        var dashCtrl = $controller('dashboard', {
          $scope: $scope
        });

        location = $location;

      // $scope is now available in tests
      });

    });

    afterEach(function () {
      $scope.$destroy();
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


    describe('saving', function () {
      beforeEach(function () {
        sinon.stub($scope, 'save', function () {});
      });
      it('should open the save dialog with openSave()', function (done) {
        expect($scope.configTemplate).to.be(undefined);
        $scope.openSave();
        expect($scope.configTemplate).to.be.a('string');
        done();
      });
      it('should unset the dialog when called again', function (done) {
        $scope.openSave();
        $scope.openSave();
        expect($scope.configTemplate).to.be(undefined);
        done();
      });
      it('should save the dashboard when submitted', function (done) {
        $scope.openSave();
        $scope.configSubmit();
        expect($scope.save.called).to.be(true);
        done();
      });
    });

    describe('loading', function () {
      beforeEach(function () {
        $scope.gridControl = {
          clearGrid: function () {},
          unserializeGrid: function () {},
        };
        _.each($scope.gridControl, function (value, key) {
          sinon.spy($scope.gridControl, key);
        });
      });

      it('should attach the schema to the dashboard object', function (done) {
        $scope.load({foo: 'bar'});
        expect($scope.dashboard.foo).to.be('bar');
        done();
      });

      it('should clear the grid before loading a new one', function (done) {
        $scope.load({foo: 'bar'});
        expect($scope.gridControl.clearGrid.called).to.be(true);
        expect($scope.gridControl.unserializeGrid.called).to.be(true);
        done();
      });
    });

  });

});