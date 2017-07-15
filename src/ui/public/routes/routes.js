import RouteManager from './route_manager';
import 'angular-route/angular-route';
import { uiModules } from 'ui/modules';
import { WAIT_FOR_URL_CHANGE_TOKEN } from './route_setup_manager';
const defaultRouteManager = new RouteManager();

// eslint-disable-next-line kibana-custom/no-default-export
export default Object.create(defaultRouteManager, {
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
