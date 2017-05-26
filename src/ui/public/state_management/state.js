/**
 * @name State
 *
 * @extends Events
 *
 * @description Persists generic "state" to and reads it from the URL.
 */

import _ from 'lodash';
import angular from 'angular';
import rison from 'rison-node';
import { applyDiff } from 'ui/utils/diff_object';
import { EventsProvider } from 'ui/events';
import { Notifier } from 'ui/notify/notifier';

import {
  createStateHash,
  HashedItemStoreSingleton,
  isStateHash,
} from './state_storage';

export function StateProvider(Private, $rootScope, $location, config, kbnUrl) {
  const Events = Private(EventsProvider);

  _.class(State).inherits(Events);
  function State(
    urlParam,
    defaults,
    hashedItemStore = HashedItemStoreSingleton,
    notifier = new Notifier()
  ) {
    State.Super.call(this);

    this.setDefaults(defaults);
    this._urlParam = urlParam || '_s';
    this._notifier = notifier;
    this._hashedItemStore = hashedItemStore;

    // When the URL updates we need to fetch the values from the URL
    this._cleanUpListeners = _.partial(_.callEach, [
      // partial route update, no app reload
      $rootScope.$on('$routeUpdate', () => {
        this.fetch();
      }),

      // beginning of full route update, new app will be initialized before
      // $routeChangeSuccess or $routeChangeError
      $rootScope.$on('$routeChangeStart', () => {
        if (!this._persistAcrossApps) {
          this.destroy();
        }
      }),

      $rootScope.$on('$routeChangeSuccess', () => {
        if (this._persistAcrossApps) {
          this.fetch();
        }
      })
    ]);

    // Initialize the State with fetch
    this.fetch();
  }

  State.prototype._readFromURL = function () {
    const search = $location.search();
    const urlVal = search[this._urlParam];

    if (!urlVal) {
      return null;
    }

    if (isStateHash(urlVal)) {
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
      this._notifier.error('Unable to parse URL');
      search[this._urlParam] = this.toQueryParam(this._defaults);
      $location.search(search).replace();
    }

    if (!risonEncoded) {
      return null;
    }

    if (this.isHashingEnabled()) {
      // RISON can find its way into the URL any number of ways, including the navbar links or
      // shared urls with the entire state embedded. These values need to be translated into
      // hashes and replaced in the browser history when state-hashing is enabled
      search[this._urlParam] = this.toQueryParam(risonEncoded);
      $location.search(search).replace();
    }

    return risonEncoded;
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
    const diffResults = applyDiff(this, stash);

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
    const state = this.toObject();
    replace = replace || false;

    if (!stash) {
      replace = true;
      stash = {};
    }

    // apply diff to state from stash, will change state in place via side effect
    const diffResults = applyDiff(stash, _.defaults({}, state, this._defaults));

    if (diffResults.keys.length) {
      this.emit('save_with_changes', diffResults.keys);
    }

    // persist the state in the URL
    const search = $location.search();
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
    kbnUrl.removeParam(this.getQueryParamName());
    // apply diff to _attributes from defaults, this is side effecting so
    // it will change the state in place.
    const diffResults = applyDiff(this, this._defaults);
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
    if (!isStateHash(queryParam)) {
      return rison.decode(queryParam);
    }

    const json = this._hashedItemStore.getItem(queryParam);
    if (json === null) {
      this._notifier.error('Unable to completely restore the URL, be sure to use the share functionality.');
    }

    return JSON.parse(json);
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

  State.prototype.isHashingEnabled = function () {
    return !!config.get('state:storeInSessionStorage');
  };

  /**
   *  Produce the hash version of the state in it's current position
   *
   *  @return {string}
   */
  State.prototype.toQueryParam = function (state = this.toObject()) {
    if (!this.isHashingEnabled()) {
      return rison.encode(state);
    }

    // We need to strip out Angular-specific properties.
    const json = angular.toJson(state);
    const hash = createStateHash(json, hash => {
      return this._hashedItemStore.getItem(hash);
    });
    const isItemSet = this._hashedItemStore.setItem(hash, json);

    if (isItemSet) {
      return hash;
    }

    // If we ran out of space trying to persist the state, notify the user.
    this._notifier.fatal(
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
  };

  /**
   *  Get the query string parameter name where this state writes and reads
   *  @return {string}
   */
  State.prototype.getQueryParamName = function () {
    return this._urlParam;
  };

  return State;

}
