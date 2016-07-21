describe('Date Format', function () {
  var expect = require('expect.js');
  var ngMock = require('ngMock');
  var moment = require('moment-timezone');
  var fieldFormats;
  var settings;
  var convert;
  var $scope;
  var off;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, config, $rootScope) {
    $scope = $rootScope;
    settings = config;

    fieldFormats = Private(require('ui/registry/field_formats'));
    var DateFormat = fieldFormats.getType('date');
    var date = new DateFormat();

    convert = date.convert.bind(date);
  }));

  it('decoding an undefined or null date should return an empty string', function () {
    expect(convert(null)).to.be('-');
    expect(convert(undefined)).to.be('-');
  });

  it('should clear the memoization cache after changing the date', function () {
    function setDefaultTimezone() {
      moment.tz.setDefault(settings.get('dateFormat:tz'));
    }
    var time = 1445027693942;

    off = $scope.$on('change:config.dateFormat:tz', setDefaultTimezone);

    settings.set('dateFormat:tz', 'America/Chicago');
    $scope.$digest();
    var chicagoTime = convert(time);

    settings.set('dateFormat:tz', 'America/Phoenix');
    $scope.$digest();
    var phoenixTime = convert(time);

    expect(chicagoTime).not.to.equal(phoenixTime);
    off();
  });
});
