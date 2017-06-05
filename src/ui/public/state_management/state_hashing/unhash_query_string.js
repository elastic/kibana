import { mapValues } from 'lodash';

export function unhashQueryString(parsedQueryString, states) {
  return mapValues(parsedQueryString, (val, key) => {
    const state = states.find(s => key === s.getQueryParamName());
    return state ? state.translateHashToRison(val) : val;
  });
}
