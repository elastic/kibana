import template from './kbn_timepicker_absolute_panel.html';
import { uiModules } from '../../modules';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerAbsolutePanel', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      absolute: '=',
      applyAbsolute: '&',
      format: '=',
      pickFromDate: '=',
      pickToDate: '=',
      setToNow: '&'
    },
    template,
    controller: function () {
    }
  };
});
