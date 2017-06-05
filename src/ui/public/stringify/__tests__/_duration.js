import expect from 'expect.js';
import ngMock from 'ng_mock';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';

describe('Duration Format', function () {
  let fieldFormats;
  let DurationFormat;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
    DurationFormat = fieldFormats.getType('duration');
  }));

  test({ inputFormat: 'seconds', outputFormat: 'humanize' })
    (-60, 'minus a minute')
    (60,  'a minute')
    (125, '2 minutes');

  test({ inputFormat: 'minutes', outputFormat: 'humanize' })
    (-60, 'minus an hour')
    (60,  'an hour')
    (125, '2 hours');

  test({ inputFormat: 'minutes', outputFormat: 'asHours' }) // outputPrecision defaults to: 2
    (-60, '-1.00')
    (60,  '1.00')
    (125, '2.08');

  test({ inputFormat: 'seconds', outputFormat: 'asSeconds', outputPrecision: 0 })
    (-60, '-60')
    (60,  '60')
    (125, '125');

  test({ inputFormat: 'seconds', outputFormat: 'asSeconds', outputPrecision: 2 })
    (-60, '-60.00')
    (-32.333, '-32.33')
    (60,  '60.00')
    (125, '125.00');

  function test({ inputFormat, outputFormat, outputPrecision }) {
    return function testFixture(input, output) {
      it(`should format ${input} ${inputFormat} through ${outputFormat}${outputPrecision ? `, ${outputPrecision} decimals` : ''}`, () => {
        const duration = new DurationFormat({ inputFormat, outputFormat, outputPrecision });
        expect(duration.convert(input)).to.eql(output);
      });
      return testFixture;
    };
  }
});
