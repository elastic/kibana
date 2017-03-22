import _ from 'lodash';
import qs from 'ui/utils/query_string';
import StateManagementStateProvider from 'ui/state_management/state';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana/global_state');

function GlobalStateProvider(Private) {
  const State = Private(StateManagementStateProvider);

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
}

module.service('globalState', function (Private) {
  return Private(GlobalStateProvider);
});
export default GlobalStateProvider;
