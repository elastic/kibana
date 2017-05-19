import template from './kbn_timepicker_quick_panel.html';
import { uiModules } from 'ui/modules';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerQuickPanel', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      quickLists: '=',
      setQuick: '&'
    },
    template,
    controller: function () {
    }
  };
});
