import uiModules from 'ui/modules';
import template from './tool_bar_pager_buttons.html';

const app = uiModules.get('kibana');

app.directive('toolBarPagerButtons', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      hasNextPage: '=',
      hasPreviousPage: '=',
      onPageNext: '=',
      onPagePrevious: '=',
    },
    controllerAs: 'toolBarPagerButtons',
    bindToController: true,
    controller: class ToolBarPagerButtonsController {
      nextPage = () => {
        this.onPageNext();
      };

      previousPage = () => {
        this.onPagePrevious();
      };
    }
  };
});
