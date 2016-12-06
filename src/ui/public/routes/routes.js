import RouteManager from './route_manager';
import 'angular-route/angular-route';
import uiModules from 'ui/modules';
let isEnabled = false; // UI Routing is false by default, until `enable()` is called
let defaultRouteManager = new RouteManager();

module.exports = {
  ...defaultRouteManager,
  isEnabled() {
    return isEnabled;
  },
  enable() {
    uiModules
    .get('kibana', ['ngRoute'])
    .config(defaultRouteManager.config);

    isEnabled = true;
  }
};
