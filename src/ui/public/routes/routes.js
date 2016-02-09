import RouteManager from './RouteManager';
import 'angular-route/angular-route';
import uiModules from 'ui/modules';
var defaultRouteManager = new RouteManager();

module.exports = {
  ...defaultRouteManager,
  enable() {
    uiModules
    .get('kibana', ['ngRoute'])
    .config(defaultRouteManager.config);
  }
};
