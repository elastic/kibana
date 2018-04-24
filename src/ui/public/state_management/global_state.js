import { QueryString } from '../utils/query_string';
import { StateProvider } from './state';
import { uiModules } from '../modules';
import { createLegacyClass } from '../utils/legacy_class';

const module = uiModules.get('kibana/global_state');

export function GlobalStateProvider(Private) {
  const State = Private(StateProvider);

  createLegacyClass(GlobalState).inherits(State);
  function GlobalState(defaults) {
    GlobalState.Super.call(this, '_g', defaults);
  }

  // if the url param is missing, write it back
  GlobalState.prototype._persistAcrossApps = true;

  GlobalState.prototype.removeFromUrl = function (url) {
    return QueryString.replaceParamInUrl(url, this._urlParam, null);
  };

  return new GlobalState();
}

module.service('globalState', function (Private) {
  return Private(GlobalStateProvider);
});
