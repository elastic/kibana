import _ from 'lodash';
import 'ui/watch_multi';
import angular from 'angular';
import 'ui/directives/input_focus';
import uiModules from 'ui/modules';
import KbnTopNavControllerProvider from './kbn_top_nav_controller';

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
  return {
    restrict: 'E',
    transclude: true,
    template($el, $attrs) {
      // This is ugly
      // This is necessary because of navbar-extensions
      // It will no accept any programatic way of setting its name
      // besides this because it happens so early in the digest cycle
      return `
        <navbar class="kibana-nav-options">
          <div ng-transclude></div>
          <div class="button-group kibana-nav-actions" role="toolbar">
            <button
              ng-repeat="menuItem in kbnTopNav.menuItems"
              aria-label="{{::menuItem.description}}"
              aria-haspopup="{{!menuItem.hasFunction}}"
              aria-expanded="{{kbnTopNav.is(menuItem.key)}}"
              ng-class="{active: kbnTopNav.is(menuItem.key)}"
              ng-click="menuItem.run(menuItem)"
              ng-bind="menuItem.label">
            </button>
            <navbar-extensions name="${$attrs.name}"></navbar-extensions>
          </div>
          <kbn-global-timepicker></kbn-global-timepicker>
        </navbar>
        <div class="config" ng-show="kbnTopNav.rendered">
          <div id="template_wrapper" class="container-fluid"></div>
          <div class="config-close remove">
            <i class="fa fa-chevron-circle-up" ng-click="kbnTopNav.close()"></i>
          </div>
        </div>
      `;
    },
    controller($scope, $compile, $attrs, $element) {
      const KbnTopNavController = Private(KbnTopNavControllerProvider);

      $scope.kbnTopNav = new KbnTopNavController(_.get($scope, $attrs.config));
      $scope.kbnTopNav._link($scope, $element);
      return $scope.kbnTopNav;
    }
  };
});
