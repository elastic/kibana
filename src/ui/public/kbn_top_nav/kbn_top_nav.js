/**
 * kbnTopNav directive
 */

import _ from 'lodash';
import angular from 'angular';
import chrome from 'ui/chrome';
// import 'ui/watch_multi';
// import 'ui/directives/input_focus';
import './kbn_top_nav_state';
import uiModules from 'ui/modules';
import kbnTopNavTemplate from './kbn_top_nav.html';
import './menu/kbn_top_nav_menu';

const module = uiModules.get('kibana');

module.directive('kbnTopNav', function (Private) {
  return {
    restrict: 'E',
    transclude: true,
    template: kbnTopNavTemplate,
    controllerAs: 'ctrl',
    controller($scope, $attrs, $element, $transclude, kbnTopNavState) {
      // This is a semi-hacky solution to missing slot-transclusion support in Angular 1.4.7
      // (it was added as a core feature in 1.5). Borrowed from http://stackoverflow.com/a/22080765.
      $scope.transcludes = {};
      $scope.menu;

      // Process transcluded content.
      $transclude(clone => {
        // Transclude the menu, if there is one.
        $scope.menu = _.find(clone, item => {
          if (item.attributes) {
            return _.find(item.attributes, attr => {
              return attr.name.indexOf('data-menu') !== -1;
            });
          }
        });

        // Extract miscellaneous transcluded elements for use in the link function.
        // We expect the transcluded elements to be wrapped in a single div.
        const transcludedContentContainer = _.find(clone, item => {
          if (item.attributes) {
            return _.find(item.attributes, attr => {
              return attr.name.indexOf('data-transclude-slots') !== -1;
            });
          }
        });

        if (!transcludedContentContainer) {
          return;
        }

        const transcludedContent = transcludedContentContainer.children;
        _.forEach(transcludedContent, transcludedItem => {
          const transclusionSlot = transcludedItem.getAttribute('data-transclude-slot');
          $scope.transcludes[transclusionSlot] = transcludedItem;
        });
      });

      this.isVisible = function isVisible() {
        return chrome.getVisible();
      };

      this.closeDropdown = function closeDropdown() {
        return kbnTopNavState.closeDropdown();
      };

      this.isDropdownOpen = function isDropdownOpen() {
        return kbnTopNavState.isDropdownOpen();
      };

      $scope.$root.$on('topNavState:change', () => {
        const dropdownContainer = $element.find('[data-dropdown]');
        if (kbnTopNavState.isDropdownOpen()) {
          dropdownContainer.html(kbnTopNavState.getDropdown());
        } else {
          dropdownContainer.html('');
        }
      });

      // Close dropdown by default.
      kbnTopNavState.closeDropdown();
    },

    link(scope, element) {
      // Transclude the menu.
      if (scope.menu) {
        const menuSlot = document.querySelector('[data-menu]');
        angular.element(menuSlot).replaceWith(scope.menu);
      }

      // These are the slots where transcluded elements can go.
      const transclusionSlotNames = ['topLeftCorner', 'bottomRow'];

      // Transclude elements into specified "slots" in the top nav.
      transclusionSlotNames.forEach(name => {
        const transcludedItem = scope.transcludes[name];
        if (transcludedItem) {
          const transclusionSlot = document.querySelector(`[data-transclude-slot="${name}"]`);
          angular.element(transclusionSlot).replaceWith(transcludedItem);
        }
      });
    }
  };
});
