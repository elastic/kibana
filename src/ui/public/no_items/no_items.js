import { uiModules } from 'ui/modules';
import template from './no_items.html';

const app = uiModules.get('kibana');

app.directive('noItems', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      itemsName: '@',
    },
    controllerAs: 'noItems',
    bindToController: true,
    controller: class NoItemsController {
      constructor() {
        this.itemsName = this.itemsName || 'items';
      }
    }
  };
});
