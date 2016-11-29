import parseInterval from 'ui/utils/parse_interval';
import uiModules from 'ui/modules';

uiModules
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

