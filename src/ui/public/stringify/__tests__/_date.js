import expect from 'expect.js';
import ngMock from 'ng_mock';
import moment from 'moment-timezone';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('Date Format', function () {
  let fieldFormats;
  let settings;
  let convert;
  let $scope;
  let off;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, config, $rootScope) {
    $scope = $rootScope;
    settings = config;

    fieldFormats = Private(RegistryFieldFormatsProvider);
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
