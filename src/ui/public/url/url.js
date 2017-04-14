import _ from 'lodash';
import 'ui/filters/uriescape';
import 'ui/filters/rison';
import uiModules from 'ui/modules';
import AppStateProvider from 'ui/state_management/app_state';

uiModules.get('kibana/url')
.service('kbnUrl', function (Private) { return Private(KbnUrlProvider); });

export function KbnUrlProvider($injector, $location, $rootScope, $parse, Private, Promise, $browser) {
  const self = this;
  const pendingUrlChangedPromises = [];

  /**
   * Navigate to a url
   *
   * @param  {String} url - the new url, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the url template
   * @return {Promise<undefined>} - promise that resolves when the change goes into effect
   */
  self.change = function (url, paramObj, appState) {
    return self._changeLocation('url', url, paramObj, false, appState);
  };

  /**
   * Same as #change except only changes the url's path,
   * leaving the search string and such intact
   *
   * @param  {String} path - the new path, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the path template
   * @return {Promise<undefined>} - promise that resolves when the change goes into effect
   */
  self.changePath = function (path, paramObj) {
    return self._changeLocation('path', path, paramObj);
  };

  /**
   * Same as #change except that it removes the current url from history
   *
   * @param  {String} url - the new url, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the url template
   * @return {Promise<undefined>} - promise that resolves when the change goes into effect
   */
  self.redirect = function (url, paramObj, appState) {
    return self._changeLocation('url', url, paramObj, true, appState);
  };

  /**
   * Same as #redirect except only changes the url's path,
   * leaving the search string and such intact
   *
   * @param  {String} path - the new path, can be a template. See #eval
   * @param  {Object} [paramObj] - optional set of parameters for the path template
   * @return {Promise<undefined>} - promise that resolves when the change goes into effect
   */
  self.redirectPath = function (path, paramObj) {
    return self._changeLocation('path', path, paramObj, true);
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
      const key = expr.split('|')[0].trim();

      // verify that the expression can be evaluated
      const p = $parse(key)(paramObj);

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
    const template = obj && obj.routes && obj.routes[route];
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

  /**
   * Removes the given parameter from the url. Does so without modifying the browser
   * history.
   * @param param
   */
  self.removeParam = function (param) {
    $location.search(param, null).replace();
  };

  /**
   *  When the route resolve functions always resolve their promises immediately,
   *  because they didn't need to make network requests and used only Angular promises,
   *  the router will render the view in the same tick of the digest loop. This is ideal
   *  for performance but can lead to view flickering and unnecessary controller loading
   *  if `kbnUrl.change()` (or similar) is called within the resolve functions (or setup
   *  work).
   *
   *  It plays out like this:
   *   1. url change is detected by the router
   *   2. new route is selected and transition begins
   *   3. route resolve functions runs:
   *     a. it's determined that the user does not have a default index
   *        pattern selected (for example)
   *     b. `kbnUrl.change()` is called to send the user to settings
   *       i. `kbnUrl` calls `$location.url()` with the new url
   *       ii. `$location` debounces the calls it receives within a single
   *           digest cycle, on the next digest cycle it will reconcile with
   *           `$browser` to determine if a transition is still necessary
   *   4. route resolve functions complete within a single digest cycle because
   *      all promises were immediately resolved
   *   5. the router checks that the route it's working on is still the
   *      current route, and it is
   *   6. the router renders the view, initialing controllers and directives
   *   6. view rendering completes and the digest cycle completes
   *   --- next digest cycle ---
   *   7. `$location` detects that it's debounced url is different from `$browser`
   *      so it updates `$browser` and fires a `$locationChangeSuccess` event
   *   8. The router hears the change event, loads the new route, and starts over again
   *
   *  The tell-tale sign of this is flickering during redirection, but the
   *  part that is really undesirable is that when the view is rendered and all of
   *  it's controllers/directives are instantiated. This often causes data to load
   *  unnecessarily or can lead to fatal errors because the resolve functions didn't
   *  run as expected.
   *
   *  To fix this we need to ensure that route resolve() functions do not resolve
   *  before the `$location` service syncs with the `$browser` service. In order to
   *  know if that is the case we:
   *
   *   - create a urlChangedPromise for each call to `$location.url()` that
   *     only resolves once `$location.absUrl()` and `$browser.url()` return
   *     the same value
   *   - keep an array of all pending urlChangedPromises
   *   - after any setup work completes or fails, call `kbnUrl.awaitPendingUrlChanges()`
   *     and delay resolution until that promise resolves.
   *
   *  When route setup work does not call kbnUrl methods, `awaitPendingUrlChanges()` returns
   *  a resolved promise so that route load time will not increase and will simply fill the
   *  gaps caused by the specific timing required to reproduce this error.
   *
   *  @return {Promise<undefined>}
   */
  self.awaitPendingUrlChanges = function () {
    return Promise.all(pendingUrlChangedPromises);
  };

  /////
  // private api
  /////
  let reloading;

  self._changeLocation = function (type, url, paramObj, replace, appState) {
    const prev = {
      path: $location.path(),
      search: $location.search()
    };

    url = self.eval(url, paramObj);
    $location[type](url);
    if (replace) $location.replace();

    if (appState) {
      $location.search(appState.getQueryParamName(), appState.toQueryParam());
    }

    const next = {
      path: $location.path(),
      search: $location.search()
    };

    const urlChangedPromise = this.createUrlPersistedPromise();
    if (!$injector.has('$route')) {
      return urlChangedPromise;
    }

    const $route = $injector.get('$route');
    if (!self._shouldForceReload(next, prev, $route)) {
      return urlChangedPromise;
    }

    reloading = true;
    const currentAppState = Private(AppStateProvider).getAppState();
    if (currentAppState) currentAppState.destroy();
    return urlChangedPromise.then(() => {
      reloading = false;
      $route.reload();
    });
  };

  self.createUrlPersistedPromise = function () {
    const promise = new Promise(resolve => {
      const unwatch = $rootScope.$watch(function () {
        if ($browser.url() !== $location.absUrl()) {
          // url change still pending
          return;
        }

        unwatch();
        const i = pendingUrlChangedPromises.indexOf(promise);
        if (i > -1) pendingUrlChangedPromises.splice(i, 1);
        resolve();
      });
    });

    pendingUrlChangedPromises.push(promise);
    return promise;
  };

  // determine if the router will automatically reload the route
  self._shouldForceReload = function (next, prev, $route) {
    if (reloading) return false;

    const route = $route.current && $route.current.$$route;
    if (!route) return false;

    // for the purposes of determining whether the router will
    // automatically be reloading, '' and '/' are equal
    const nextPath = next.path || '/';
    const prevPath = prev.path || '/';
    if (nextPath !== prevPath) return false;

    const reloadOnSearch = route.reloadOnSearch;
    const searchSame = _.isEqual(next.search, prev.search);
    return (reloadOnSearch && searchSame) || !reloadOnSearch;
  };
}
