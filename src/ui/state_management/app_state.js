define(function (require) {
  var _ = require('lodash');
  var modules = require('ui/modules');
  var urlParam = '_a';


  function AppStateProvider(Private, $rootScope, getAppState) {
    var State = Private(require('ui/state_management/state'));


    _.class(AppState).inherits(State);
    function AppState(defaults) {
      AppState.Super.call(this, urlParam, defaults);
      getAppState._set(this);
    }

    // if the url param is missing, write it back
    AppState.prototype._persistAcrossApps = false;


    AppState.prototype.destroy = function () {
      AppState.Super.prototype.destroy.call(this);
      getAppState._set(null);
    };

    return AppState;
  }

  modules.get('kibana/global_state')
  .factory('AppState', function (Private) {
    return Private(AppStateProvider);
  })
  .service('getAppState', function ($location) {
    var currentAppState;

    function get() {
      return currentAppState;
    }

    // Checks to see if the appState might already exist, even if it hasn't been newed up
    get.previouslyStored = function () {
      var search = $location.search();
      return search[urlParam] ? true : false;
    };

    get._set = function (current) {
      currentAppState = current;
    };

    return get;
  });

  return AppStateProvider;
});
