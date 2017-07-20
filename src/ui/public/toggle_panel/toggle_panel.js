import { uiModules } from 'ui/modules';
import template from './toggle_panel.html';
import 'ui/toggle_button';

const app = uiModules.get('kibana');

app.directive('togglePanel', function () {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: template,
    scope: {
      togglePanelId: '@',
      text: '@',
      isCollapsed: '=',
      onToggle: '='
    },
    controllerAs: 'togglePanel',
    bindToController: true,
    controller: class TogglePanelController {
      toggle = () => {
        this.onToggle(this.togglePanelId);
      };
    }
  };
});
