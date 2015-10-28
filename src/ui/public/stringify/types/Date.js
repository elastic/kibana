define(function (require) {
  return function DateTimeFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));
    var BoundToConfigObj = Private(require('ui/bound_to_config_obj'));
    var moment = require('moment');

    require('ui/field_format_editor/pattern/pattern');

    _.class(DateTime).inherits(FieldFormat);
    function DateTime(params) {
      DateTime.Super.call(this, params);
    }

    DateTime.id = 'date';
    DateTime.title = 'Date';
    DateTime.fieldType = 'date';

    DateTime.paramDefaults = new BoundToConfigObj({
      pattern: '=dateFormat',
      timezone: '=dateFormat:tz'
    });

    DateTime.editor = {
      template: require('ui/stringify/editors/date.html'),
      controllerAs: 'cntrl',
      controller: function ($interval, $scope) {
        var self = this;
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
      var pattern = this.param('pattern');
      var timezone = this.param('timezone');

      var timezoneChanged = this._timeZone !== timezone;
      var datePatternChanged = this._memoizedPattern !== pattern;
      if (timezoneChanged || datePatternChanged) {
        this._timeZone = timezone;
        this._memoizedPattern = pattern;

        this._memoizedConverter = _.memoize(function converter(val) {
          if (val === null || val === undefined) {
            return '-';
          }
          return moment(val).format(pattern);
        });
      }

      return this._memoizedConverter(val);
    };

    return DateTime;
  };
});
