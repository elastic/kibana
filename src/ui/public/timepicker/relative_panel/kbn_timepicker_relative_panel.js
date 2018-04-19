import template from './kbn_timepicker_relative_panel.html';
import { uiModules } from '../../modules';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerRelativePanel', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      applyRelative: '&',
      checkRelative: '&',
      formatRelative: '&',
      relative: '=',
      relativeOptions: '=',
      setRelativeToNow: '&',
      units: '='
    },
    template,
    controller: function () {
    }
  };
});
