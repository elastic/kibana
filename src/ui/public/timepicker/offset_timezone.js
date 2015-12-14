define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var moment = require('moment');

  require('ui/modules')
  .get('kibana')
  .directive('offsetTimezone', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, $el, attrs, ngModelCntrl) {
        ngModelCntrl.$formatters.unshift(toDatePicker);
        ngModelCntrl.$parsers.unshift(fromDatePicker);

        // State for whether the last change was internal or external
        // Internal changes(i.e selecting a new day multiple times) should not
        // continue to offset the date.
        var offsetDate = false;

        function fromDatePicker(value) {
          if (!value) return;
          var date = moment(value);

          if (offsetDate) {
            var offset = value.getTimezoneOffset() + date.utcOffset();
            offsetDate = false;
            date.minutes(date.minutes() - offset);
          }
          return date;
        }

        function toDatePicker(value) {
          if (!value) return;

          var date = new Date(value.format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
          var offset = date.getTimezoneOffset() + value.utcOffset();
          date.setMinutes(date.getMinutes() + offset);
          offsetDate = true;

          ngModelCntrl.$modelValue = date;
        }
      }
    };
  });
});
