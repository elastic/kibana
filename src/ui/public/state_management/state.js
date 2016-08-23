import _ from 'lodash';
import angular from 'angular';
import rison from 'rison-node';
import applyDiff from 'ui/utils/diff_object';
import qs from 'ui/utils/query_string';
import EventsProvider from 'ui/events';
import Notifier from 'ui/notify/notifier';
import KbnUrlProvider from 'ui/url';

import {
  HashingStore,
  LazyLruStore,
} from './state_storage';

const MAX_BROWSER_HISTORY = 50;

export default function StateProvider(Private, $rootScope, $location, config) {
  const Events = Private(EventsProvider);

  _.class(State).inherits(Events);
  function State(urlParam, defaults, { hashingStore, notify } = {}) {
    State.Super.call(this);

    let self = this;
    self.setDefaults(defaults);
    self._urlParam = urlParam || '_s';
    this._notify = notify || new Notifier();
    self._hasher = hashingStore || new HashingStore({
      store: new LazyLruStore({
        id: `${this._urlParam}:state`,
        store: window.sessionStorage,
        maxItems: MAX_BROWSER_HISTORY
      })
    });

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
  }

  State.prototype._readFromURL = function () {
    const search = $location.search();
    const urlVal = search[this._urlParam];

    if (!urlVal) {
      return null;
    }

    if (this._hasher.isHash(urlVal)) {
      return this._parseQueryParamValue(urlVal);
    }

    let risonEncoded;
    let unableToParse;
    try {
      risonEncoded = rison.decode(urlVal);
    } catch (e) {
      unableToParse = true;
    }

    if (unableToParse) {
      this._notify.error('Unable to parse URL');
      search[this._urlParam] = this.toQueryParam(this._defaults);
      $location.search(search).replace();
    }

    if (risonEncoded) {
      search[this._urlParam] = this.toQueryParam(risonEncoded);
      $location.search(search).replace();
      return risonEncoded;
    }

    return null;
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

    // apply diff to state from stash, will change state in place via side effect
    let diffResults = applyDiff(stash, _.defaults({}, state, this._defaults));

    if (diffResults.keys.length) {
      this.emit('save_with_changes', diffResults.keys);
    }

    // persist the state in the URL
    let search = $location.search();
    search[this._urlParam] = this.toQueryParam(state);
    if (replace) {
      $location.search(search).replace();
    } else {
      $location.search(search);
    }
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

  /**
   *  Parse the query param value to it's unserialized
   *  value. Hashes are restored to their pre-hashed state.
   *
   *  @param  {string} queryParam - value from the query string
   *  @return {any} - the stored value, or null if hash does not resolve
   */
  State.prototype._parseQueryParamValue = function (queryParam) {
    if (!this._hasher.isHash(queryParam)) {
      return rison.decode(queryParam);
    }

    const stored = this._hasher.lookup(queryParam);
    if (stored === null) {
      this._notify.error('Unable to completely restore the URL, be sure to use the share functionality.');
    }

    return stored;
  };

  /**
   *  Lookup the value for a hash and return it's value
   *  in rison format
   *
   *  @param  {string} hash
   *  @return {string} rison
   */
  State.prototype.translateHashToRison = function (hash) {
    return rison.encode(this._parseQueryParamValue(hash));
  };

  /**
   *  Produce the hash version of the state in it's current position
   *
   *  @return {string}
   */
  State.prototype.toQueryParam = function (state = this.toObject()) {
    if (!config.get('state:storeInSessionStorage')) {
      return rison.encode(state);
    }

    try {
      return this._hasher.add(state);
    } catch (err) {
      this._notify.log('Unable to create hash of State due to error: ' + (state.stack || state.message));
      this._notify.fatal(
        new Error(
          'Kibana is unable to store history items in your session ' +
          'because it is full and there don\'t seem to be items any items safe ' +
          'to delete.\n' +
          '\n' +
          'This can usually be fixed by moving to a fresh tab, but could ' +
          'be caused by a larger issue. If you are seeing this message regularly, ' +
          'please file an issue at https://github.com/elastic/kibana/issues.'
        )
      );
    }
  };

  /**
   *  Get the query string parameter name where this state writes and reads
   *  @return {string}
   */
  State.prototype.getQueryParamName = function () {
    return this._urlParam;
  };

  return State;

};
