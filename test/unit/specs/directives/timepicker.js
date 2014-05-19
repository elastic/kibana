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

  var $parentScope, $scope, $elem;
  var clock, anchor = '2014-01-01T06:06:06.666Z';

  var init = function () {
    // Load the application
    module('kibana');

    // Stub out the clock so 'now' doesn't move
    clock = sinon.useFakeTimers(moment(anchor).valueOf());

    // Create the scope
    inject(function ($rootScope, $compile) {

      // Give us a scope
      $parentScope = $rootScope;

      // Add some parameters to it
      $parentScope.time = {
        from: moment().subtract(15, 'minutes'),
        to: moment(),
        mode: undefined // Any isolate scope var using '=' must be passed, even if undefined
      };

      // Create the element
      $elem = angular.element(
        '<kbn-timepicker from="time.from" to="time.to" mode="time.mode"></kbn-timepicker>'
      );

      // And compile it
      $compile($elem)($parentScope);

      // Fire a digest cycle
      $elem.scope().$digest();

      // Grab the isolate scope so we can test it
      $scope = $elem.isolateScope();
    });
  };

  describe('mode setting', function () {

    beforeEach(function () {
      init();
    });

    it('should be in quick mode by default', function (done) {
      expect($scope.mode).to.be('quick');
      done();
    });

    it('should highlight the right mode', function (done) {
      expect($elem.find('.kbn-timepicker-modes .active').text()).to.be('quick');

      // Each of the 3 modes
      var modes = ['absolute', 'relative', 'quick'];
      _.each(modes, function (mode) {
        $scope.setMode(mode);
        $scope.$digest();
        expect($elem.find('.kbn-timepicker-modes .active').text()).to.be(mode);
      });

      done();
    });

  });

  describe('quick mode', function () {

    beforeEach(function () {
      init();
      $scope.setMode('quick');
      $scope.$digest();
    });

    it('should contain 3 lists of options', function (done) {
      expect($elem.find('.kbn-timepicker-section .list-unstyled').length).to.be(3);
      done();
    });

    it('should have a $scope.setQuick() that sets the to and from variables to strings', function (done) {
      $scope.setQuick('now', 'now');
      expect($scope.from).to.be('now');
      expect($scope.to).to.be('now');
      done();
    });
  });

  describe('relative mode', function () {

    beforeEach(function () {
      init();
      $scope.setMode('relative');
      $scope.$digest();
    });

    it('has a preview of the "from" input', function (done) {
      var preview = $elem.find('.kbn-timepicker-section span[ng-show="relative.preview"]');
      expect(preview.text()).to.be(moment().subtract(1, 'minutes').format($scope.format));
      done();
    });

    it('has a disabled "to" field that contains "Now"', function (done) {
      expect($elem.find('.kbn-timepicker-section input[disabled]').val()).to.be('Now');
      done();
    });

    it('has a dropdown bound to relative.unit that contains all of the intervals', function (done) {
      var select = $elem.find('.kbn-timepicker-section select[ng-model="relative.unit"]');
      expect(select.length).to.be(1);
      expect(select.find('option').length).to.be(7);

      // Check each relative option, make sure it is in the list
      _.each($scope.relativeOptions, function (unit, i) {
        expect(select.find('option')[i].text).to.be(unit.text);
      });
      done();
    });

    it('has a checkbox that is checked when rounding is enabled', function (done) {
      var checkbox = $elem.find('.kbn-timepicker-section input[ng-model="relative.round"]');
      expect(checkbox.length).to.be(1);

      // Rounding is disabled by default
      expect(checkbox.attr('checked')).to.be(undefined);

      // Enable rounding
      $scope.relative.round = true;
      $scope.$digest();
      expect(checkbox.attr('checked')).to.be('checked');

      done();
    });

  });

});