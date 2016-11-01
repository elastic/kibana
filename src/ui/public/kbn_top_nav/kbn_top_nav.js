/**
 * kbnTopNav directive
 *
 * The top section that shows the timepicker, load, share and save dialogues.
 *
 * ```
 * <kbn-top-nav name="current-app-for-extensions" config="path.to.menuItems"></kbn-top-nav>
 * ```
 *
 * Menu items/templates are passed to the kbnTopNav via the config attribute
 * and should be defined as an array of objects. Each object represents a menu
 * item and should have the following properties:
 *
 * @param {Array<Object>|KbnTopNavController} config
 * @param {string} config[].key
 *        - the uniq key for this menu item.
 * @param {string} [config[].label]
 *        - optional, string that will be displayed for the menu button.
 *        Defaults to the key
 * @param {string} [config[].description]
 *        - optional, used for the screen-reader description of this menu
 *        item, defaults to "Toggle ${key} view" for templated menu items
 *        and just "${key}" for programatic menu items
 * @param {boolean} [config[].hideButton]
 *        - optional, set to true to prevent a menu item from being created.
 *        This allow injecting templates into the navbar that don't have
 *        an associated template
 * @param {function} [config[].run]
 *        - optional, function to call when the menu item is clicked, defaults
 *        to toggling the template
 *
 * Programatic control of the navbar can be acheived one of two ways
 */

import _ from 'lodash';
import angular from 'angular';
import 'ui/watch_multi';
import 'ui/directives/input_focus';
import uiModules from 'ui/modules';
import template from './kbn_top_nav.html';
import KbnTopNavControllerProvider from './kbn_top_nav_controller';
import RegistryNavbarExtensionsProvider from 'ui/registry/navbar_extensions';

const module = uiModules.get('kibana');

module.directive('kbnTopNav', function (Private) {
  const KbnTopNavController = Private(KbnTopNavControllerProvider);
  const navbarExtensions = Private(RegistryNavbarExtensionsProvider);
  const getNavbarExtensions = _.memoize(function (name) {
    if (!name) throw new Error('navbar directive requires a name attribute');
    return _.sortBy(navbarExtensions.byAppName[name], 'order');
  });

  return {
    restrict: 'E',
    transclude: true,
    template,

    // TODO: The kbnTopNav currently requires that it share a scope with
    // its parent directive. This allows it to export the kbnTopNav controller
    // and allows the config templates to use values from the parent scope.
    //
    // Moving this to an isolate scope will require modifying the config
    // directive to support child directives, instead of templates, so that
    // parent controllers can be imported/required rather than simply referenced
    // directly in the template.
    //
    // TODO: Our fake multi-slot transclusion solution also depends on an inherited
    // scope. Moving this to an isolate scope will cause this to break.
    //
    // scope: {}

    controller($scope, $attrs, $element, $transclude) {
      // This is a semi-hacky solution to missing slot-transclusion support in Angular 1.4.7
      // (it was added as a core feature in 1.5). Borrowed from http://stackoverflow.com/a/22080765.
      $scope.transcludes = {};

      // Extract transcluded elements for use in the link function.
      $transclude(clone => {
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
        };

        const transcludedContent = transcludedContentContainer.children;
        _.forEach(transcludedContent, transcludedItem => {
          const transclusionSlot = transcludedItem.getAttribute('data-transclude-slot');
          $scope.transcludes[transclusionSlot] = transcludedItem;
        });
      });

      const extensions = getNavbarExtensions($attrs.name);
      let controls = _.get($scope, $attrs.config, []);
      if (controls instanceof KbnTopNavController) {
        controls.addItems(extensions);
      } else {
        controls = controls.concat(extensions);
      }

      $scope.kbnTopNav = new KbnTopNavController(controls);
      $scope.kbnTopNav._link($scope, $element);

      return $scope.kbnTopNav;
    },

    link(scope, element) {
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
