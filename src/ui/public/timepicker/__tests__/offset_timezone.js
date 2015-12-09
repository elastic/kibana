var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var moment = require('moment-timezone');
var sinon = require('sinon');
var $ = require('jquery');

require('ui/timepicker/offset_timezone');

describe('Offset timezone', function () {
  let $compile;
  let $rootScope;
  let element;
  let getTimezoneOffset;

  const html = '<div offset-timezone ng-model="value"/>{{value}}</div>';
  const timezoneOffset = 60;
  const mockDate = '2015-11-23T15:01:18-01:00';

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    getTimezoneOffset = sinon.stub(Date.prototype, 'getTimezoneOffset', function () {
      return timezoneOffset;
    });
  }));

  beforeEach(function () {
    element = $compile(html)($rootScope);
  });

  it('should offset the timezone so the day is not changed when converting from moment to the Date constructor', function () {
    var mockDate = $rootScope.value = moment(mockDate).tz('UTC');
    $rootScope.$digest();
    var offsetDate = moment(element.controller('ngModel').$modelValue);

    expect(offsetDate.diff(mockDate, 'minutes')).to.be(timezoneOffset);
  });

  it('should keep the date the same when reading from the DOM', function () {
    var mockDate = $rootScope.value = moment(mockDate).tz('UTC');
    $rootScope.$digest();
    var domDate = moment($(element).text().replace(/"/g, ''));

    expect(domDate.diff(mockDate, 'minutes')).to.be(0);
  });

  afterEach(function () {
    getTimezoneOffset.restore();
  });
});
