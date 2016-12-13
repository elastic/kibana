import RouteManager from './route_manager';
import 'angular-route/angular-route';
import uiModules from 'ui/modules';
const defaultRouteManager = new RouteManager();

module.exports = {
  ...defaultRouteManager,
  enable() {
    uiModules
    .get('kibana', ['ngRoute'])
    .config(defaultRouteManager.config);
  }
};
