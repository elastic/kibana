import { uiModules } from 'ui/modules';
import template from './selectable_row.html';

const app = uiModules.get('kibana');

app.directive('selectableRow', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      id: '=',
      isSelected: '=',
      onSelectChange: '=',
    },
    controllerAs: 'selectableRow',
    bindToController: true,
    controller: class SelectableRowController {
    }
  };
});
