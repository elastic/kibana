import expect from 'expect.js';
import ngMock from 'ng_mock';
import moment from 'moment-timezone';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
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
    const DateFormat = fieldFormats.getType('date');
    const date = new DateFormat();

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
    const time = 1445027693942;

    off = $scope.$on('change:config.dateFormat:tz', setDefaultTimezone);

    settings.set('dateFormat:tz', 'America/Chicago');
    $scope.$digest();
    const chicagoTime = convert(time);

    settings.set('dateFormat:tz', 'America/Phoenix');
    $scope.$digest();
    const phoenixTime = convert(time);

    expect(chicagoTime).not.to.equal(phoenixTime);
    off();
  });

  it('should parse date math values', function () {
    expect(convert('2015-01-01||+1M/d')).to.be('January 1st 2015, 00:00:00.000');
  });
});
