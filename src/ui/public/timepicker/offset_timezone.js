define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var moment = require('moment');

  /**
  *  moment objects can have an associated timezone, and when converting to a Date the
  *  timezone is changed to browser time.  This can cause issues, such as a day picker
  *  showing the wrong day.
  *  When a moment date is passed in, offset the timezone so that after converting to a Date object
  *  the day does not appear changed.  When reading back, convert to moment and remove the offset.
  */
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

        //Going from Date object to moment
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

        //Going from moment to Date object
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
