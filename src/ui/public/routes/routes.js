import RouteManager from './route_manager';
import 'angular-route/angular-route';
import { uiModules } from 'ui/modules';
const defaultRouteManager = new RouteManager();
import { ABORT_SETUP_WORK_TOKEN } from './route_setup_manager';

module.exports = {
  ...defaultRouteManager,
  ABORT_SETUP_WORK_TOKEN,
  enable() {
    uiModules
    .get('kibana', ['ngRoute'])
    .config(defaultRouteManager.config);
  }
};
