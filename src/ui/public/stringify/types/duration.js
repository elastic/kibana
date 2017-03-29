import 'ui/stringify/editors/duration.less';
import moment from 'moment';
import IndexPatternsFieldFormatProvider from 'ui/index_patterns/_field_format/field_format';
import durationTemplate from 'ui/stringify/editors/duration.html';

export default function DurationFormatProvider(Private) {
  const ratioToSeconds = {
    picoseconds: 0.000000000001,
    nanoseconds: 0.000000001,
    microseconds: 0.000001
  };
  const FieldFormat = Private(IndexPatternsFieldFormatProvider);
  const HUMAN_FRIENDLY = 'humanize';
  const DEFAULT_OUTPUT_PRECISION = 2;
  const DEFAULT_INPUT_FORMAT = { text: 'Seconds', kind: 'seconds' };
  const inputFormats = [
    { text: 'Picoseconds', kind: 'picoseconds' },
    { text: 'Nanoseconds', kind: 'nanoseconds' },
    { text: 'Microseconds', kind: 'microseconds' },
    { text: 'Milliseconds', kind: 'milliseconds' },
    DEFAULT_INPUT_FORMAT,
    { text: 'Minutes', kind: 'minutes' },
    { text: 'Hours', kind: 'hours' },
    { text: 'Days', kind: 'days' },
    { text: 'Weeks', kind: 'weeks' },
    { text: 'Months', kind: 'months' },
    { text: 'Years', kind: 'years' }
  ];
  const DEFAULT_OUTPUT_FORMAT = { text: 'Human Readable', method: 'humanize' };
  const outputFormats = [
    DEFAULT_OUTPUT_FORMAT,
    { text: 'Milliseconds', method: 'asMilliseconds' },
    { text: 'Seconds', method: 'asSeconds' },
    { text: 'Minutes', method: 'asMinutes' },
    { text: 'Hours', method: 'asHours' },
    { text: 'Days', method: 'asDays' },
    { text: 'Weeks', method: 'asWeeks' },
    { text: 'Months', method: 'asMonths' },
    { text: 'Years', method: 'asYears' }
  ];

  class Duration extends FieldFormat {
    isHuman() {
      return this.param('outputFormat') === HUMAN_FRIENDLY;
    }
    _convert(val) {
      const inputFormat = this.param('inputFormat');
      const outputFormat = this.param('outputFormat');
      const outputPrecision = this.param('outputPrecision');
      const human = this.isHuman();
      const prefix = val < 0 && human ? 'minus ' : '';
      const duration = parseInputAsDuration(val, inputFormat);
      const formatted = duration[outputFormat]();
      const precise = human ? formatted : formatted.toFixed(outputPrecision);
      return prefix + precise;
    }
  }

  Duration.id = 'duration';
  Duration.title = 'Duration';
  Duration.fieldType = 'number';

  Duration.inputFormats = inputFormats;
  Duration.outputFormats = outputFormats;

  Duration.editor = {
    template: durationTemplate,
    controllerAs: 'cntrl',
    controller() {
      this.sampleInputs = [
        -123,
        1,
        12,
        123,
        658,
        1988,
        3857,
        123292,
        923528271
      ];
    }
  };

  Duration.paramDefaults = {
    inputFormat: DEFAULT_INPUT_FORMAT.kind,
    outputFormat: DEFAULT_OUTPUT_FORMAT.method,
    outputPrecision: DEFAULT_OUTPUT_PRECISION
  };

  return Duration;

  function parseInputAsDuration(val, inputFormat) {
    const ratio = ratioToSeconds[inputFormat] || 1;
    const kind = inputFormat in ratioToSeconds ? 'seconds' : inputFormat;
    return moment.duration(val * ratio, kind);
  }
}
