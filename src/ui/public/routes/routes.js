import RouteManager from './route_manager';
import 'angular-route/angular-route';
import { uiModules } from 'ui/modules';
const defaultRouteManager = new RouteManager();
import { WAIT_FOR_URL_CHANGE_TOKEN } from './route_setup_manager';

module.exports = {
  ...defaultRouteManager,
  WAIT_FOR_URL_CHANGE_TOKEN,
  enable() {
    uiModules
    .get('kibana', ['ngRoute'])
    .config(defaultRouteManager.config);
  }
};
