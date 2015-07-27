define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var qs = require('ui/utils/query_string');
  var rison = require('ui/utils/rison');

  var module = require('ui/modules').get('kibana/global_state');

  module.service('globalState', function (Private, $rootScope, $location) {
    var State = Private(require('ui/state_management/state'));

    _.class(GlobalState).inherits(State);
    function GlobalState(defaults) {
      GlobalState.Super.call(this, '_g', defaults);
    }

    // if the url param is missing, write it back
    GlobalState.prototype._persistAcrossApps = true;

    GlobalState.prototype.removeFromUrl = function (url) {
      return qs.replaceParamInUrl(url, this._urlParam, null);
    };

    return new GlobalState();
  });
});
