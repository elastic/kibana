import 'ui/state_management/app_state';
import 'ui/state_management/global_state';

export default function getUnhashableStatesProvider(getAppState, globalState) {
  return function getUnhashableStates() {
    return [getAppState(), globalState].filter(Boolean);
  };
}
