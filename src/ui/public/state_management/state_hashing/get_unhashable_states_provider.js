export function getUnhashableStatesProvider(getAppState, globalState) {
  return function getUnhashableStates() {
    return [getAppState(), globalState].filter(Boolean);
  };
}
