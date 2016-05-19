import _ from 'lodash';
import 'ui/filters/uriescape';
import 'ui/filters/rison';
import uiModules from 'ui/modules';
import rison from 'rison-node';


uiModules.get('kibana/url')
.service('kbnUrl', function (Private) { return Private(KbnUrlProvider); });

function KbnUrlProvider($route, $location, $rootScope, globalState, $parse, getAppState) {
  let self = this;

  /**
   * Navigate to a url
   *
   * @param  {String} url - the new url, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the url template
   * @return {undefined}
   */
  self.change = function (url, paramObj, appState) {
    self._changeLocation('url', url, paramObj, false, appState);
  };

  /**
   * Same as #change except only changes the url's path,
   * leaving the search string and such intact
   *
   * @param  {String} path - the new path, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the path template
   * @return {undefined}
   */
  self.changePath = function (path, paramObj) {
    self._changeLocation('path', path, paramObj);
  };

  /**
   * Same as #change except that it removes the current url from history
   *
   * @param  {String} url - the new url, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the url template
   * @return {undefined}
   */
  self.redirect = function (url, paramObj, appState) {
    self._changeLocation('url', url, paramObj, true, appState);
  };

  /**
   * Same as #redirect except only changes the url's path,
   * leaving the search string and such intact
   *
   * @param  {String} path - the new path, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the path template
   * @return {undefined}
   */
  self.redirectPath = function (path, paramObj) {
    self._changeLocation('path', path, paramObj, true);
  };

  /**
   * Evaluate a url template. templates can contain double-curly wrapped
   * expressions that are evaluated in the context of the paramObj
   *
   * @param  {String} template - the url template to evaluate
   * @param  {Object} [paramObj] - the variables to expose to the template
   * @return {String} - the evaluated result
   * @throws {Error} If any of the expressions can't be parsed.
   */
  self.eval = function (template, paramObj) {
    paramObj = paramObj || {};

    return template.replace(/\{\{([^\}]+)\}\}/g, function (match, expr) {
      // remove filters
      let key = expr.split('|')[0].trim();

      // verify that the expression can be evaluated
      let p = $parse(key)(paramObj);

      // if evaluation can't be made, throw
      if (_.isUndefined(p)) {
        throw new Error('Replacement failed, unresolved expression: ' + expr);
      }

      // append uriescape filter if not included
      if (expr.indexOf('uriescape') === -1) {
        expr += '|uriescape';
      }

      return $parse(expr)(paramObj);
    });
  };

  /**
   * convert an object's route to an href, compatible with
   * window.location.href= and <a href="">
   *
   * @param  {Object} obj - any object that list's it's routes at obj.routes{}
   * @param  {string} route - the route name
   * @return {string} - the computed href
   */
  self.getRouteHref = function (obj, route) {
    return '#' + self.getRouteUrl(obj, route);
  };

  /**
   * convert an object's route to a url, compatible with url.change() or $location.url()
   *
   * @param  {Object} obj - any object that list's it's routes at obj.routes{}
   * @param  {string} route - the route name
   * @return {string} - the computed url
   */
  self.getRouteUrl = function (obj, route) {
    let template = obj && obj.routes && obj.routes[route];
    if (template) return self.eval(template, obj);
  };

  /**
   * Similar to getRouteUrl, supports objects which list their routes,
   * and redirects to the named route. See #redirect
   *
   * @param  {Object} obj - any object that list's it's routes at obj.routes{}
   * @param  {string} route - the route name
   * @return {undefined}
   */
  self.redirectToRoute = function (obj, route) {
    self.redirect(self.getRouteUrl(obj, route));
  };

  /**
   * Similar to getRouteUrl, supports objects which list their routes,
   * and changes the url to the named route. See #change
   *
   * @param  {Object} obj - any object that list's it's routes at obj.routes{}
   * @param  {string} route - the route name
   * @return {undefined}
   */
  self.changeToRoute = function (obj, route) {
    self.change(self.getRouteUrl(obj, route));
  };

  /////
  // private api
  /////
  let reloading;

  self._changeLocation = function (type, url, paramObj, replace, appState) {
    let prev = {
      path: $location.path(),
      search: $location.search()
    };

    url = self.eval(url, paramObj);
    $location[type](url);
    if (replace) $location.replace();

    if (appState) {
      $location.search('_a', rison.encode(appState));
    }

    let next = {
      path: $location.path(),
      search: $location.search()
    };

    if (self._shouldAutoReload(next, prev)) {
      let appState = getAppState();
      if (appState) appState.destroy();

      reloading = $rootScope.$on('$locationChangeSuccess', function () {
        // call the "unlisten" function returned by $on
        reloading();
        reloading = false;

        $route.reload();
      });
    }
  };

  self._shouldAutoReload = function (next, prev) {
    if (reloading) return false;

    let route = $route.current && $route.current.$$route;
    if (!route) return false;

    if (next.path !== prev.path) return false;

    let reloadOnSearch = route.reloadOnSearch;
    let searchSame = _.isEqual(next.search, prev.search);

    return (reloadOnSearch && searchSame) || !reloadOnSearch;
  };
}

export default KbnUrlProvider;
