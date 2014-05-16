define(function (require) {
  var angular = require('angular');
  var mocks = require('angular-mocks');
  var moment = require('moment');
  var _ = require('lodash');
  var $ = require('jquery');
  var sinon = require('sinon/sinon');


  // Load the kibana app dependencies.
  require('angular-route');

  // Load kibana and its applications
  require('index');
  require('apps/visualize/index');
  require('apps/dashboard/index');

  // TODO: This should not be needed, timefilter is only included here, it should move
  require('apps/discover/index');


  describe('Modes', function () {
    var $scope, $elem, $isolateScope;

    var clock, anchor = '2014-01-01T06:06:06.666Z';

    beforeEach(function () {
      // Load the application
      module('kibana');

      // Stub out the clock so 'now' doesn't move
      clock = sinon.useFakeTimers(moment(anchor).valueOf());

      // Create the scope
      inject(function ($rootScope, $compile) {

        // Give us a scope
        $scope = $rootScope;

        // Add some parameters to it
        $scope.time = {
          from: moment().subtract(15, 'minutes'),
          to: moment(),
          mode: undefined // Any isolate scope var using '=' must be passed, even if undefined
        };

        // Create the element
        $elem = angular.element(
          '<kbn-timepicker from="time.from" to="time.to" mode="time.mode"></kbn-timepicker>'
        );

        // And compile it
        $compile($elem)($scope);

        // Fire a digest cycle
        $elem.scope().$apply();

        // Grab the isolate scope so we can test it
        $isolateScope = $elem.isolateScope();
      });

    });

    it('should be in quick mode by default', function (done) {
      expect($isolateScope.mode).to.be('quick');
      done();
    });

    it('should highlight the right mode', function (done) {
      expect($elem.find('.kbn-timepicker-modes .active').text()).to.be('quick');

      var modes = ['absolute', 'relative', 'quick'];
      _.each(modes, function (mode) {
        $isolateScope.setMode(mode);
        $isolateScope.$apply();
        expect($elem.find('.kbn-timepicker-modes .active').text()).to.be(mode);
      });

      done();
    });

  });

});