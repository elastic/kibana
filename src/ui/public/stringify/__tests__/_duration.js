import expect from 'expect.js';
import ngMock from 'ngMock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';

describe('Duration Format', function () {
  var fieldFormats;
  var DurationFormat;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
    DurationFormat = fieldFormats.getType('duration');
  }));

  const inputs = [
    -60,
    60,
    125
  ];
  const fixtures = [{
    params: {
      inputFormat: 'seconds',
      outputFormat: 'humanize'
    },
    outputs: [
      'minus a minute',
      'a minute',
      '2 minutes'
    ]
  }, {
    params: {
      inputFormat: 'seconds',
      outputFormat: 'asSeconds',
      outputPrecision: 0
    },
    outputs: [
      '-60',
      '60',
      '125'
    ]
  }, {
    params: {
      inputFormat: 'seconds',
      outputFormat: 'asSeconds',
      outputPrecision: 2
    },
    outputs: [
      '-60.00',
      '60.00',
      '125.00'
    ]
  }, {
    params: {
      inputFormat: 'minutes',
      outputFormat: 'asHours',
      outputPrecision: 0
    },
    outputs: [
      '-1',
      '1',
      '2'
    ]
  }, {
    params: {
      inputFormat: 'minutes',
      outputFormat: 'humanize'
    },
    outputs: [
      'minus an hour',
      'an hour',
      '2 hours'
    ]
  }];

  fixtures.forEach((fixture, i) => {
    const p = fixture.params;
    inputs.forEach((input, j) => {
      it(`should format #${i},${j}: "${input} [${p.inputFormat}]" input as duration [${p.outputFormat}:${p.outputPrecision}]`, () => {
        const output = fixture.outputs[j];
        const duration = new DurationFormat(p);
        expect(duration.convert(input)).to.eql(output);
      });
    });
  });
});
