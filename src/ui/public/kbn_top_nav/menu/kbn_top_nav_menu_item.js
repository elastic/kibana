import _ from 'lodash';
import kbnTopNavMenuItemTemplate from './kbn_top_nav_menu_item.html';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

let dropdownIdCounter = 0;

module.directive('kbnTopNavMenuItem', () => {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    scope: {
      onClick: '&',
      label: '@',
      description: '@',
      testId: '@',
      hide: '@',
      disable: '@',
      tooltip: '@',
    },
    template: kbnTopNavMenuItemTemplate,
    controllerAs: 'ctrl',
    controller: function ($scope, $transclude, kbnTopNavState) {
      const ID = dropdownIdCounter++;

      function getTranscludedElements() {
        let transcludedElements = [];

        $transclude(clone => {
          transcludedElements = _.filter(clone, item => {
            // If the transcluded element has a child that's an element, then that is the dropdown.
            return item.nodeType === 1;
          });
        });
      }

      let transcludedElements = getTranscludedElements();
      if (transcludedElements.length === 2) {
        $scope.label = transcludedElements[0];
      }

      this.onClick = function onClick() {
        let dropdown;
        transcludedElements = getTranscludedElements();

        if (transcludedElements.length === 1) {
          dropdown = transcludedElements[0];
        } else if (transcludedElements.length === 2) {
          dropdown = transcludedElements[1];
        }

        if (dropdown) {
          // Show transcluded children as dropdown.
          kbnTopNavState.toggleDropdown(dropdown, ID);
        } else {
          kbnTopNavState.closeDropdown();
        }

        $scope.onClick();
      };

      this.isDropdownOpen = function isDropdownOpen() {
        return ID === kbnTopNavState.getOpenDropdownId();
      };

      this.isDisabled = function isDisabled() {
        // TODO
      };
    }
  };
});
