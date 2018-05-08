import RouteManager from './route_manager';
import 'angular-route/angular-route';
import { uiModules } from '../modules';
import { WAIT_FOR_URL_CHANGE_TOKEN } from './route_setup_manager';
const defaultRouteManager = new RouteManager();

export const uiRoutes = Object.create(defaultRouteManager, {
  WAIT_FOR_URL_CHANGE_TOKEN: {
    value: WAIT_FOR_URL_CHANGE_TOKEN
  },

  enable: {
    value() {
      uiModules
        .get('kibana', ['ngRoute'])
        .config(defaultRouteManager.config)
        .run(defaultRouteManager.run);
    }
  }
});
