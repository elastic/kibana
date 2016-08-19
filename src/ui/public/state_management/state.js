import KbnUrlProvider from 'ui/url';

define(function (require) {
  let _ = require('lodash');
  let rison = require('ui/utils/rison');

  let applyDiff = require('ui/utils/diff_object');
  let qs = require('ui/utils/query_string');

  return function StateProvider(Notifier, Private, $rootScope, $location) {
    const notify = new Notifier();
    const Events = Private(require('ui/events'));

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
          if (self._persistAcrossApps) {
            self.fetch();
          } else {
            self.destroy();
          }
        })
      ]);

      // Initialize the State with fetch
      self.fetch();
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

      // persist the state in the URL
      let search = $location.search();
      search[this._urlParam] = this.toRISON();
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

    return State;

  };

});
