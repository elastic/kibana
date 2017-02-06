import uiModules from 'ui/modules';
import template from './tool_bar_pager_text.html';

const app = uiModules.get('kibana');

app.directive('toolBarPagerText', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      startItem: '=',
      endItem: '=',
      totalItems: '=',
    },
    controllerAs: 'toolBarPagerText',
    bindToController: true,
    controller: class ToolBarPagerTextController {
    }
  };
});
