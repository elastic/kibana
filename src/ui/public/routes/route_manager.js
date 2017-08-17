import { cloneDeep, defaultsDeep, wrap } from 'lodash';

import { wrapRouteWithPrep } from './wrap_route_with_prep';
import { RouteSetupManager } from './route_setup_manager';
import { parsePathToBreadcrumbs } from './breadcrumbs';

function RouteManager() {
  const self = this;
  const setup = new RouteSetupManager();
  const when = [];
  const defaults = [];
  let otherwise;

  self.config = function ($routeProvider) {
    when.forEach(function (args) {
      const path = args[0];
      const route = args[1] || {};

      defaults.forEach(def => {
        if (def.regex.test(path)) {
          defaultsDeep(route, cloneDeep(def.value));
        }
      });

      if (route.reloadOnSearch == null) {
        route.reloadOnSearch = false;
      }

      if (route.requireDefaultIndex == null) {
        route.requireDefaultIndex = false;
      }

      wrapRouteWithPrep(route, setup);
      $routeProvider.when(path, route);
    });

    if (otherwise) {
      wrapRouteWithPrep(otherwise, setup);
      $routeProvider.otherwise(otherwise);
    }
  };

  self.run = function ($location, $route, $injector) {
    self.getBreadcrumbs = () => {
      const breadcrumbs = parsePathToBreadcrumbs($location.path());
      const map = $route.current.mapBreadcrumbs;
      return map ? $injector.invoke(map, null, { breadcrumbs }) : breadcrumbs;
    };
  };

  const wrapSetupAndChain = (fn, ...args) => {
    fn.apply(setup, args);
    return this;
  };

  this.addSetupWork = wrap(setup.addSetupWork, wrapSetupAndChain);
  this.afterSetupWork = wrap(setup.afterSetupWork, wrapSetupAndChain);
  this.afterWork = wrap(setup.afterWork, wrapSetupAndChain);

  self.when = function (path, route) {
    when.push([path, route]);
    return self;
  };

  // before attaching the routes to the routeProvider, test the RE
  // against the .when() path and add/override the resolves if there is a match
  self.defaults = function (regex, value) {
    defaults.push({ regex, value });
    return self;
  };

  self.otherwise = function (route) {
    otherwise = route;
    return self;
  };

  self.getBreadcrumbs = function () {
    // overwritten in self.run();
    return [];
  };

  self.RouteManager = RouteManager;
}

module.exports = RouteManager;
