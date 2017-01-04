import './kbn_top_nav_menu_item';

import kbnTopNavMenuTemplate from './kbn_top_nav_menu.html';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('kbnTopNavMenu', () => {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: kbnTopNavMenuTemplate
  };
});
