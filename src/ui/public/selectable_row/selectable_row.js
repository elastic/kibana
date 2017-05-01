import { uiModules } from 'ui/modules';
import template from './selectable_row.html';

const app = uiModules.get('kibana');

app.directive('selectableRow', function () {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: template,
    scope: {
      item: '=',
      selected: '=',
      onSelectChange: '=',
    },
    controllerAs: 'selectableRow',
    bindToController: true,
    controller: class SelectableRowController {
    }
  };
});
