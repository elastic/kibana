import { uiModules } from 'ui/modules';
import template from './table_info.html';

const app = uiModules.get('kibana');

app.directive('tableInfo', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      resultsName: '@',
    },
    controllerAs: 'tableInfo',
    bindToController: true,
    controller: class TableInfoController {
      constructor() {
        this.resultsName = this.resultsName || 'items';
      }
    }
  };
});
