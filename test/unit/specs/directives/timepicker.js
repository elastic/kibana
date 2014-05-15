define(function (require) {
  var angular = require('angular');
  var mocks = require('angular-mocks');
  var moment = require('moment');
  var _ = require('lodash');
  var $ = require('jquery');
  var sinon = require('sinon/sinon');


  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the directive
  require('index');
  require('apps/visualize/index');
  require('apps/dashboard/index');

  // TODO: This should not be needed, timefilter is only included here
  require('apps/discover/index');


  describe('Modes', function () {
    var $scope, $elem;
    var clock, anchor = '2014-01-01T06:06:06.666Z';

    beforeEach(function () {
      // Need some module, doesn't matter which really
      module('kibana');

      clock = sinon.useFakeTimers(moment(anchor).valueOf());

      // Create the scope
      inject(function ($rootScope, $compile) {

        $scope = $rootScope;

        $scope.time = {
          from: moment().subtract(15, 'minutes'),
          to: moment()
        };

        $elem = angular.element(
          '<kbn-timepicker from="time.from" to="time.to"></kbn-timepicker>'
        );

        $compile($elem)($scope);
      });

    });

    it('should contain something', function (done) {
      expect($elem.text().length).to.be.above(1);
      done();
    });

  });

});