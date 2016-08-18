import _ from 'lodash';
import angular from 'angular';
import rison from 'rison-node';
import applyDiff from 'ui/utils/diff_object';
import qs from 'ui/utils/query_string';
import EventsProvider from 'ui/events';
import Notifier from 'ui/notify/notifier';
import KbnUrlProvider from 'ui/url';

const notify = new Notifier();
export default function StateProvider(Private, $rootScope, $location) {
  const Events = Private(EventsProvider);

  _.class(State).inherits(Events);
  function State(urlParam, defaults) {
    State.Super.call(this);

    let self = this;
    self.setDefaults(defaults);
    self._urlParam = urlParam || '_s';

    // When the URL updates we need to fetch the values from the URL
    self._cleanUpListeners = _.partial(_.callEach, [
      // partial route update, no app reload
      $rootScope.$on('$routeUpdate', function () {
        self.fetch();
      }),

      // beginning of full route update, new app will be initialized before
      // $routeChangeSuccess or $routeChangeError
      $rootScope.$on('$routeChangeStart', function () {
        if (!self._persistAcrossApps) {
          self.destroy();
        }
      }),

      $rootScope.$on('$routeChangeSuccess', function () {
        if (self._persistAcrossApps) {
          self.fetch();
        }
      })
    ]);

    // Initialize the State with fetch
    self.fetch();

    // External actors in the system can request the current url params to be re-broadcast.
    $rootScope.$on('state:triggerQueryParamChange', this.broadcastQueryParams.bind(this));
  }

  State.prototype._readFromURL = function () {
    let search = $location.search();
    try {
      return search[this._urlParam] ? rison.decode(search[this._urlParam]) : null;
    } catch (e) {
      notify.error('Unable to parse URL');
      search[this._urlParam] = rison.encode(this._defaults);
      $location.search(search).replace();
      return null;
    }
  };

  /**
   * Fetches the state from the url
   * @returns {void}
   */
  State.prototype.fetch = function () {
    let stash = this._readFromURL();

    // nothing to read from the url? save if ordered to persist
    if (stash === null) {
      if (this._persistAcrossApps) {
        return this.save();
      } else {
        stash = {};
      }
    }

    _.defaults(stash, this._defaults);

    // Internalize vis state on `this`. Once the vis state is initially read from the URL, it will
    // never be read from it again.
    // TODO: Allow properties such as vis to be dynamically specified via a public method,
    // e.g. `internalizeParam()`.
    if (this.toObject().vis) {
      stash.vis = this.toObject().vis;
    }

    // TODO: Because we are removing the vis prop from the URL, it's also removed from the history.
    // This means that navigating to a different part of the app and then hitting the browser back
    // button will take you to an empty visualization. One possible solution is to store the current
    // vis in the history with replaceState and pass it in as the state arg. Then, when the user
    // navigates away and then back to this route, we need to listen for onpopstate and use the state
    // to build the visualization.

    // apply diff to state from stash, will change state in place via side effect
    let diffResults = applyDiff(this, stash);

    if (diffResults.keys.length) {
      this.emit('fetch_with_changes', diffResults.keys);
    }
  };

  /**
   * Saves the state to the url
   * @returns {void}
   */
  State.prototype.save = function (replace) {
    let stash = this._readFromURL();
    let state = this.toObject();
    replace = replace || false;

    if (!stash) {
      replace = true;
      stash = {};
    }

    _.defaults(state, this._defaults);
    // apply diff to state from stash, will change state in place via side effect
    let diffResults = applyDiff(stash, state);

    if (diffResults.keys.length) {
      this.emit('save_with_changes', diffResults.keys);
    }

    // Prevent vis state from being persisted to the URL. It's now represented internally on `this`.
    delete state.vis;

    // persist the state in the URL
    let search = $location.search();
    // RISON-encode state instead of `this`, because we only want to persist certain properties to
    // the URL, e.g. *not* vis state.
    search[this._urlParam] = rison.encode(JSON.parse(angular.toJson(state)));
    if (replace) {
      $location.search(search).replace();
    } else {
      $location.search(search);
    }

    this.broadcastQueryParams();
  };

  State.prototype.broadcastQueryParams = function () {
    $rootScope.$broadcast('state:queryParamChange', this._urlParam, this.toRISON());
  };

  /**
   * Calls save with a forced replace
   * @returns {void}
   */
  State.prototype.replace = function () {
    this.save(true);
  };

  /**
   * Resets the state to the defaults
   *
   * @returns {void}
   */
  State.prototype.reset = function () {
    // apply diff to _attributes from defaults, this is side effecting so
    // it will change the state in place.
    let diffResults = applyDiff(this, this._defaults);
    if (diffResults.keys.length) {
      this.emit('reset_with_changes', diffResults.keys);
    }
    this.save();
  };

  /**
   * Cleans up the state object
   * @returns {void}
   */
  State.prototype.destroy = function () {
    this.off(); // removes all listeners
    this._cleanUpListeners(); // Removes the $routeUpdate listener
  };

  State.prototype.setDefaults = function (defaults) {
    this._defaults = defaults || {};
  };

  return State;

};
