define(function (require) {
  let _ = require('lodash');
  let modules = require('ui/modules');
  let urlParam = '_a';

  function AppStateProvider(Private, $rootScope, getAppState) {
    let State = Private(require('ui/state_management/state'));
    let PersistedState = Private(require('ui/persisted_state/persisted_state'));
    let persistedStates;
    let eventUnsubscribers;

    _.class(AppState).inherits(State);
    function AppState(defaults) {
      persistedStates = {};
      eventUnsubscribers = [];

      AppState.Super.call(this, urlParam, defaults);
      getAppState._set(this);
    }

    // if the url param is missing, write it back
    AppState.prototype._persistAcrossApps = false;

    AppState.prototype.destroy = function () {
      AppState.Super.prototype.destroy.call(this);
      getAppState._set(null);
      _.callEach(eventUnsubscribers);
    };

    AppState.prototype.makeStateful = function (prop) {
      if (persistedStates[prop]) return persistedStates[prop];
      let self = this;

      // set up the ui state
      persistedStates[prop] = new PersistedState();

      // update the app state when the stateful instance changes
      let updateOnChange = function () {
        let replaceState = false; // TODO: debouncing logic

        self[prop] = persistedStates[prop].getChanges();
        self.save(replaceState);
      };
      let handlerOnChange = (method) => persistedStates[prop][method]('change', updateOnChange);
      handlerOnChange('on');
      eventUnsubscribers.push(() => handlerOnChange('off'));

      // update the stateful object when the app state changes
      let persistOnChange = function (changes) {
        if (!changes) return;

        if (changes.indexOf(prop) !== -1) {
          persistedStates[prop].set(self[prop]);
        }
      };
      let handlePersist = (method) => this[method]('fetch_with_changes', persistOnChange);
      handlePersist('on');
      eventUnsubscribers.push(() => handlePersist('off'));

      // if the thing we're making stateful has an appState value, write to persisted state
      if (self[prop]) persistedStates[prop].setSilent(self[prop]);

      return persistedStates[prop];
    };

    return AppState;
  }

  modules.get('kibana/global_state')
  .factory('AppState', function (Private) {
    return Private(AppStateProvider);
  })
  .service('getAppState', function ($location) {
    let currentAppState;

    function get() {
      return currentAppState;
    }

    // Checks to see if the appState might already exist, even if it hasn't been newed up
    get.previouslyStored = function () {
      let search = $location.search();
      return search[urlParam] ? true : false;
    };

    get._set = function (current) {
      currentAppState = current;
    };

    return get;
  });

  return AppStateProvider;
});
