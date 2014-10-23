define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the directive
  require('plugins/visualize/index');
  require('plugins/dashboard/index');

  // TODO: This should not be needed, timefilter is only included here
  require('plugins/discover/index');


  describe('Dashboard panels', function () {
    var $scope, $elem;

    beforeEach(function () {

      module('kibana');

      // Create the scope
      inject(function ($rootScope, $compile) {

        $scope = $rootScope;

        var params = {
          type: 'new'
        };

        $elem = angular.element(
          '<dashboard-panel params=\'' + JSON.stringify(params) + '\'></dashboard-panel>'
        );

        $compile($elem)($scope);
        $scope.$digest();
      });

    });

    it('should have a close button', function (done) {
      var closeIcon = $elem.find('i.remove');
      expect(closeIcon.length).to.be(1);
      done();
    });

    it('should have the name of the panel', function (done) {
      expect($elem.text()).to.be('new');
      done();
    });

  });

});
