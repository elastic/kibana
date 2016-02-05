import RouteManager from './RouteManager';
import 'angular-route/angular-route';
var defaultRouteManager = new RouteManager();

module.exports = {
  ...defaultRouteManager,
  enable() {
    require('ui/modules')
    .get('kibana', ['ngRoute'])
    .config(defaultRouteManager.config);
  }
};
