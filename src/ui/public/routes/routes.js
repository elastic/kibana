let RouteManager = require('./RouteManager');
let defaultRouteManager = new RouteManager();

module.exports = {
  ...defaultRouteManager,
  enable() {
    require('angular-route/angular-route');
    require('ui/modules')
    .get('kibana', ['ngRoute'])
    .config(defaultRouteManager.config);
  }
};
