define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var sinon = require('test_utils/auto_release_sinon');


  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the modules
  require('plugins/dashboard/index');

  describe('Dashboard app', function () {
    var $scope,
      location,
      currentDash;

    beforeEach(function (done) {
      module('app/dashboard');

      // Create the scope
      inject(function (savedDashboards, $rootScope, $controller, $location) {
        savedDashboards.get()
        .then(function (dash) {
          currentDash = dash;
          $scope = $rootScope.$new();
          var dashCtrl = $controller('dashboard', {
            $scope: $scope,
            $route: {
              current: {
                locals: {
                  dash: dash
                }
              }
            }
          });
          location = $location;
          done();
        }, done);
        $rootScope.$apply();
      // $scope is now available in tests
      });

    });

    afterEach(function () {
      $scope.$destroy();
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
      it('should attach the dash to the $scope', function (done) {
        expect($scope.dash).to.be(currentDash);
        done();
      });
    });

  });

});