define(function (require) {
  var angular = require('angular');
  var moment = require('moment');
  var _ = require('lodash');
  var $ = require('jquery');
  var sinon = require('test_utils/auto_release_sinon');


  // Load the kibana app dependencies.
  require('angular-route');

  require('plugins/visualize/index');
  require('plugins/dashboard/index');

  // TODO: This should not be needed, timefilter is only included here, it should move
  require('plugins/discover/index');

  var $parentScope, $scope, $elem;
  var anchor = '2014-01-01T06:06:06.666Z';
  var clock;

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
      var timefilter = {
        time : {
          from: moment().subtract(15, 'minutes'),
          to: moment(),
          mode: undefined
        },
        refreshInterval : {
          value : 0,
          display : 'Off'
        }
      };
      $parentScope.timefilter = timefilter;

      // Create the element
      $elem = angular.element(
        '<kbn-timepicker' +
        ' from="timefilter.time.from"' +
        ' to="timefilter.time.to"' +
        ' mode="timefilter.time.mode"' +
        ' interval="timefilter.refreshInterval">' +
        '</kbn-timepicker>'
      );

      // And compile it
      $compile($elem)($parentScope);

      // Fire a digest cycle
      $elem.scope().$digest();

      // Grab the isolate scope so we can test it
      $scope = $elem.isolateScope();
    });
  };


  describe('timepicker directive', function () {

    describe('tabs', function () {

      beforeEach(function () {
        init();
      });

      it('should contain two tabs', function (done) {
        expect($elem.find('.tab-pane').length).to.be(2);
        done();
      });
    });

    describe('refresh interval', function () {
      var $courier;
      beforeEach(function () {
        init();
        inject(function (courier, $rootScope) {
          $courier = courier;
          $rootScope.$apply();
        });
      });

      it('should contain a list of options', function (done) {
        expect($elem.find('.kbn-refresh-section').length).to.be.greaterThan(0);
        done();
      });

      it('should have a $scope.setRefreshInterval() that sets interval variable', function (done) {
        $scope.setRefreshInterval('interval');
        expect($scope.interval).to.be('interval');
        done();
      });

      it('should set the interval on the courier', function (done) {
        // Change refresh interval and digest
        $scope.setRefreshInterval({ value : 1000});
        $elem.scope().$digest();
        expect($courier.searchLooper.loopInterval()).to.be(1000);
        done();
      });

      it('should highlight the current active interval', function (done) {
        $scope.setRefreshInterval({ value: 300000 });
        $elem.scope().$digest();
        expect($elem.find('.refresh-interval-active').length).to.be(1);
        expect($elem.find('.refresh-interval-active').text().trim()).to.be('5 minutes');
        done();
      });

      it('should default the interval on the courier with incorrect values', function (done) {
        // Change refresh interval and digest
        $scope.setRefreshInterval('undefined');
        $elem.scope().$digest();
        expect($courier.searchLooper.loopInterval()).to.be(0);
        done();
      });
    });

    describe('mode setting', function () {

      beforeEach(function () {
        init();
      });

      it('should be in quick mode by default', function (done) {
        expect($scope.mode).to.be('quick');
        done();
      });

      it('should highlight the right mode', function (done) {
        expect($elem.find('.kbn-timepicker-modes .active').text().trim()).to.be('quick');

        // Each of the 3 modes
        var modes = ['absolute', 'relative', 'quick'];
        _.each(modes, function (mode) {
          $scope.setMode(mode);
          $scope.$digest();
          expect($elem.find('.kbn-timepicker-modes .active').text().trim()).to.be(mode);
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

      it('should contain 4 lists of options', function (done) {
        expect($elem.find('.kbn-timepicker-section .list-unstyled').length).to.be(4);
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
        expect(preview.text()).to.be(moment().subtract(15, 'minutes').format($scope.format));
        done();
      });

      it('has a disabled "to" field that contains "Now"', function (done) {
        expect($elem.find('.kbn-timepicker-section input[disabled]').val()).to.be('Now');
        done();
      });

      it('has a submit handler', function (done) {
        var form = $elem.find('form[ng-submit="applyRelative()"]');
        expect(form.length).to.be(1);
        done();
      });

      it('disables the submit button if the form is invalid', function (done) {
        var button;
        button = $elem.find('button[disabled]');
        expect(button.length).to.be(0);

        // Make the form invalid
        $scope.relative.count = 'foo';
        $scope.formatRelative();
        $scope.$digest();

        button = $elem.find('button[disabled]');
        expect(button.length).to.be(1);
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

      it('rounds the preview down to the unit when rounding is enabled', function (done) {
        // Enable rounding
        $scope.relative.round = true;
        $scope.relative.count = 0;

        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.count = 0;
          $scope.relative.unit = shortUnit;
          $scope.formatRelative();

          // The preview should match the start of the unit eg, the start of the minute
          expect($scope.relative.preview).to.be(moment().startOf(longUnit).format($scope.format));
        });

        done();
      });

      it('does not round the preview down to the unit when rounding is disable', function (done) {
        // Disable rounding
        $scope.relative.round = false;
        $scope.relative.count = 0;

        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.unit = shortUnit;
          $scope.formatRelative();

          // The preview should match the start of the unit eg, the start of the minute
          expect($scope.relative.preview).to.be(moment().format($scope.format));
        });

        done();
      });

      it('has a $scope.applyRelative() that sets from and to based on relative.round, relative.count and relative.unit', function (done) {
        // Disable rounding
        $scope.relative.round = false;
        $scope.relative.count = 1;
        $scope.relative.unit = 's';
        $scope.applyRelative();
        expect($scope.from).to.be('now-1s');

        $scope.relative.count = 2;
        $scope.relative.unit = 'm';
        $scope.applyRelative();
        expect($scope.from).to.be('now-2m');

        $scope.relative.count = 3;
        $scope.relative.unit = 'h';
        $scope.applyRelative();
        expect($scope.from).to.be('now-3h');

        // Enable rounding
        $scope.relative.round = true;
        $scope.relative.count = 7;
        $scope.relative.unit = 'd';
        $scope.applyRelative();
        expect($scope.from).to.be('now-7d/d');

        done();
      });

      it('updates the input fields when the scope variables are changed', function (done) {
        var input = $elem.find('.kbn-timepicker-section input[ng-model="relative.count"]');
        var select = $elem.find('.kbn-timepicker-section select[ng-model="relative.unit"]');

        $scope.relative.count = 5;
        $scope.$digest();
        expect(input.val()).to.be('5');


        // Should update the selected option
        var i = 0;
        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.unit = shortUnit;
          $scope.$digest();

          expect(select.val()).to.be(i.toString());
          i++;
        });

        done();

      });

    });

    describe('absolute mode', function () {

      var inputs;

      beforeEach(function () {
        init();
        $scope.setMode('absolute');
        $scope.$digest();

        inputs = {
          fromInput: $elem.find('.kbn-timepicker-section input[ng-model="absolute.from"]'),
          toInput: $elem.find('.kbn-timepicker-section input[ng-model="absolute.to"]'),
          fromCalendar: $elem.find('.kbn-timepicker-section table[ng-model="absolute.from"] '),
          toCalendar: $elem.find('.kbn-timepicker-section table[ng-model="absolute.to"] '),
        };

      });

      it('should have input boxes for absolute.from and absolute.to', function (done) {
        expect(inputs.fromInput.length).to.be(1);
        expect(inputs.toInput.length).to.be(1);
        done();
      });

      it('should have tables that contain calendars bound to absolute.from and absolute.to', function (done) {
        expect(inputs.fromCalendar.length).to.be(1);
        expect(inputs.toCalendar.length).to.be(1);
        done();
      });

      it('should present a timeframe of 15 minutes ago to now if scope.from and scope.to are not set', function (done) {
        delete $scope.from;
        delete $scope.to;
        $scope.setMode('absolute');
        $scope.$digest();

        expect($scope.absolute.from.valueOf()).to.be(moment().subtract(15, 'minutes').valueOf());
        expect($scope.absolute.to.valueOf()).to.be(moment().valueOf());
        done();
      });


      it('should parse the time of scope.from and scope.to to set its own variables', function (done) {
        $scope.setQuick('now-30m', 'now');
        $scope.setMode('absolute');
        $scope.$digest();

        expect($scope.absolute.from.valueOf()).to.be(moment().subtract(30, 'minutes').valueOf());
        expect($scope.absolute.to.valueOf()).to.be(moment().valueOf());
        done();
      });

      it('should disable the "Go" button if from > to', function (done) {
        $scope.absolute.from = moment('2012-02-01');
        $scope.absolute.to = moment('2012-02-11');
        $scope.$digest();
        expect($elem.find('.kbn-timepicker-section button.kbn-timepicker-go').attr('disabled')).to.be(undefined);

        $scope.absolute.from = moment('2012-02-12');
        $scope.absolute.to = moment('2012-02-11');
        $scope.$digest();
        expect($elem.find('.kbn-timepicker-section button.kbn-timepicker-go').attr('disabled')).to.be('disabled');
        done();
      });

      it('should only copy its input to scope.from and scope.to when scope.applyAbsolute() is called', function (done) {
        $scope.setQuick('now-30m', 'now');
        expect($scope.from).to.be('now-30m');
        expect($scope.to).to.be('now');

        $scope.absolute.from = moment('2012-02-01');
        $scope.absolute.to = moment('2012-02-11');
        expect($scope.from).to.be('now-30m');
        expect($scope.to).to.be('now');

        $scope.applyAbsolute();
        expect($scope.from.valueOf()).to.be(moment('2012-02-01').valueOf());
        expect($scope.to.valueOf()).to.be(moment('2012-02-11').valueOf());

        $scope.$digest();

        done();
      });

    });

  });

});
