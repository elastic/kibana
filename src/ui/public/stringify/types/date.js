import _ from 'lodash';
import moment from 'moment';
import 'ui/field_format_editor/pattern/pattern';
import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';
import dateTemplate from 'ui/stringify/editors/date.html';

export function stringifyDate() {

  _.class(DateTime).inherits(FieldFormat);
  function DateTime(params, getConfig) {
    DateTime.paramDefaults = {
      pattern: getConfig('dateFormat'),
      timezone: getConfig('dateFormat:tz')
    };

    DateTime.Super.call(this, params);
  }

  DateTime.id = 'date';
  DateTime.title = 'Date';
  DateTime.fieldType = 'date';

  DateTime.editor = {
    template: dateTemplate,
    controllerAs: 'cntrl',
    controller: function ($interval, $scope) {
      const self = this;
      self.sampleInputs = [
        Date.now(),
        +moment().startOf('year'),
        +moment().endOf('year')
      ];

      $scope.$on('$destroy', $interval(function () {
        self.sampleInputs[0] = Date.now();
      }, 1000));
    }
  };

  DateTime.prototype._convert = function (val) {
    // don't give away our ref to converter so
    // we can hot-swap when config changes
    const pattern = this.param('pattern');
    const timezone = this.param('timezone');

    const timezoneChanged = this._timeZone !== timezone;
    const datePatternChanged = this._memoizedPattern !== pattern;
    if (timezoneChanged || datePatternChanged) {
      this._timeZone = timezone;
      this._memoizedPattern = pattern;

      this._memoizedConverter = _.memoize(function converter(val) {
        if (val === null || val === undefined) {
          return '-';
        }

        const date = moment(val);
        if (date.isValid()) {
          return date.format(pattern);
        } else {
          return val;
        }
      });
    }

    return this._memoizedConverter(val);
  };

  return DateTime;
}
