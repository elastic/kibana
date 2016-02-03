import parseInterval from 'ui/utils/parse_interval';
define(function (require) {

  require('ui/modules')
  .get('kibana')
  .directive('validateDateInterval', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, $el, attrs, ngModelCntrl) {

        ngModelCntrl.$parsers.push(check);
        ngModelCntrl.$formatters.push(check);

        function check(value) {
          ngModelCntrl.$setValidity('dateInterval', parseInterval(value) != null);
          return value;
        }
      }
    };
  });

});
