var RouteManager = require('./RouteManager');
var defaultRouteManager = new RouteManager();

require('ui/modules')
.get('kibana', ['ngRoute'])
.config(defaultRouteManager.config);

module.exports = defaultRouteManager;
