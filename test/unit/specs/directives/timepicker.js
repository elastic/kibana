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


  describe('timepicker directive', function () {
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

      it('has a preview of the "from" and "to" inputs', function (done) {
        var preview = {
          'from': $elem.find ('.kbn-timepicker-section span[ng-show="relative.from.preview"]'),
          'to': $elem.find ('.kbn-timepicker-section span[ng-show="relative.to.preview"]')
        };
        expect(preview.from.text()).to.be(moment().subtract(1, 'minutes').format($scope.format));
        expect(preview.to.text()).to.be(moment().format($scope.format));
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
        $scope.relative.from.count = 'foo';
        $scope.formatRelative();
        $scope.$digest();

        button = $elem.find('button[disabled]');
        expect(button.length).to.be(1);
        done();
      });

      it('disables the submit button if the from date is greater than the to date', function (done) {
        var button;
        button = $elem.find('button[disabled]');
        expect(button.length).to.be(0);

        // Make the form invalid
        $scope.relative.from.count = 15;
        $scope.relative.to.count = 20;
        $scope.formatRelative();
        $scope.$digest();

        button = $elem.find('button[disabled]');
        expect(button.length).to.be(1);
        span = $elem.find('span[ng-show="relative.from.date > relative.to.date"]');
        expect(span.length).to.be(1);
        done();
      });

      it('has a dropdown bound to relative.{from,to}.unit that contains all of the intervals', function (done) {
        var select = {
          'from': $elem.find ('.kbn-timepicker-section select[ng-model="relative.from.unit"]'),
          'to': $elem.find ('.kbn-timepicker-section select[ng-model="relative.to.unit"]')
        };
        expect(select.from.length).to.be(1);
        expect(select.to.length).to.be(1);

        expect(select.from.find('option').length).to.be(7);
        expect(select.to.find('option').length).to.be(7);

        // Check each relative option, make sure it is in the list
        _.each($scope.relativeOptions, function (unit, i) {
          expect(select.from.find('option')[i].text).to.be(unit.text);
          expect(select.to.find('option')[i].text).to.be(unit.text);
        });
        done();
      });

      it('has a checkbox that is checked when rounding is enabled', function (done) {
        var checkbox = {
          'from': $elem.find ('.kbn-timepicker-section input[ng-model="relative.from.round"]'),
          'to': $elem.find ('.kbn-timepicker-section input[ng-model="relative.to.round"]')
        };
        expect(checkbox.from.length).to.be(1);
        expect(checkbox.to.length).to.be(1);

        // Rounding is disabled by default
        expect(checkbox.from.attr('checked')).to.be(undefined);
        expect(checkbox.to.attr('checked')).to.be(undefined);

        // Enable rounding for 'from' date
        $scope.relative.from.round = true;
        $scope.$digest();
        expect(checkbox.from.attr('checked')).to.be('checked');

        // Enable rounding for 'to' date
        $scope.relative.to.round = true;
        $scope.$digest();
        expect(checkbox.to.attr('checked')).to.be('checked');

        done();
      });

      it('rounds the preview down to the unit when rounding is enabled for "from" date', function (done) {
        // Enable rounding
        $scope.relative.from.round = true;
        $scope.relative.from.count = 0;

        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.from.count = 0;
          $scope.relative.from.unit = shortUnit;
          $scope.formatRelative();

          // The preview should match the start of the unit eg, the start of the minute
          expect($scope.relative.from.preview).to.be(moment().startOf(longUnit).format($scope.format));
        });

        done();
      });

      it('rounds the preview down to the unit when rounding is enabled for "to" date', function (done) {
        // Enable rounding
        $scope.relative.to.round = true;
        $scope.relative.to.count = 0;

        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.to.count = 0;
          $scope.relative.to.unit = shortUnit;
          $scope.formatRelative();

          // The preview should match the start of the unit eg, the start of the minute
          expect($scope.relative.to.preview).to.be(moment().startOf(longUnit).format($scope.format));
        });

        done();
      });

      it('does not round the preview down to the unit when rounding is disable', function (done) {
        // Disable rounding
        $scope.relative.from.round = false;
        $scope.relative.to.round = false;
        $scope.relative.from.count = 0;
        $scope.relative.to.count = 0;

        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.from.unit = shortUnit;
          $scope.relative.to.unit = shortUnit;
          $scope.formatRelative();

          // The preview should match the start of the unit eg, the start of the minute
          expect($scope.relative.from.preview).to.be(moment().format($scope.format));
          expect($scope.relative.to.preview).to.be(moment().format($scope.format));
        });

        done();
      });

      it('has a $scope.applyRelative() that sets from and to based on relative.round, relative.count and relative.unit', function (done) {
        // Test 'from' date
        // Disable rounding
        $scope.relative.from.round = false;
        $scope.relative.from.count = 1;
        $scope.relative.from.unit = 's';
        $scope.applyRelative();
        expect($scope.from).to.be('now-1s');

        $scope.relative.from.count = 2;
        $scope.relative.from.unit = 'm';
        $scope.applyRelative();
        expect($scope.from).to.be('now-2m');

        $scope.relative.from.count = 3;
        $scope.relative.from.unit = 'h';
        $scope.applyRelative();
        expect($scope.from).to.be('now-3h');

        // Enable rounding
        $scope.relative.from.round = true;
        $scope.relative.from.count = 7;
        $scope.relative.from.unit = 'd';
        $scope.applyRelative();
        expect($scope.from).to.be('now-7d/d');

        // Test 'to' date
        // set very large 'from' date to avoid 'from' > 'to'
        $scope.relative.from.count = 10;
        $scope.relative.from.unit = 'd';

        // Disable rounding
        $scope.relative.to.round = false;
        $scope.relative.to.count = 1;
        $scope.relative.to.unit = 's';
        $scope.applyRelative();
        expect($scope.to).to.be('now-1s');

        $scope.relative.to.count = 2;
        $scope.relative.to.unit = 'm';
        $scope.applyRelative();
        expect($scope.to).to.be('now-2m');

        $scope.relative.to.count = 3;
        $scope.relative.to.unit = 'h';
        $scope.applyRelative();
        expect($scope.to).to.be('now-3h');

        // Enable rounding
        $scope.relative.to.round = true;
        $scope.relative.to.count = 7;
        $scope.relative.to.unit = 'd';
        $scope.applyRelative();
        expect($scope.to).to.be('now-7d/d');

        done();
      });

      it('updates the input fields when the scope variables are changed', function (done) {
        var input = {
          'from': $elem.find('.kbn-timepicker-section input[ng-model="relative.from.count"]'),
          'to': $elem.find('.kbn-timepicker-section input[ng-model="relative.to.count"]')
        };
        var select = {
          'from': $elem.find('.kbn-timepicker-section select[ng-model="relative.from.unit"]'),
          'to': $elem.find('.kbn-timepicker-section select[ng-model="relative.to.unit"]')
        };

        $scope.relative.from.count = 5;
        $scope.relative.to.count = 2;
        $scope.$digest();
        expect(input.from.val()).to.be('5');
        expect(input.to.val()).to.be('2');


        // Should update the selected option
        var i = 0;
        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.from.unit = shortUnit;
          $scope.$digest();

          expect(select.from.val()).to.be(i.toString());
          i++;
        });
        var i = 0;
        _.each($scope.units, function (longUnit, shortUnit) {
          $scope.relative.to.unit = shortUnit;
          $scope.$digest();

          expect(select.to.val()).to.be(i.toString());
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
