import _ from 'lodash';
import 'ui/watch_multi';
import angular from 'angular';
import 'ui/directives/input_focus';
import uiModules from 'ui/modules';
import template from './kbn_top_nav.html';
import KbnTopNavControllerProvider from './kbn_top_nav_controller';
import RegistryNavbarExtensionsProvider from 'ui/registry/navbar_extensions';

const module = uiModules.get('kibana');

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
    controller($scope, $attrs, $element) {
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
    }
  };
});
