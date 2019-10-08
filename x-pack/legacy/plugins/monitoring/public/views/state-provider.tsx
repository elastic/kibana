import React from 'react';
import qs from 'querystring';

import chrome from 'ui/chrome';
import { kfetch } from 'ui/kfetch';


/**
 * #/pageId ?clusterUUID=23452a  &from=1512421234213  &to=1523452345434 &refresh=true &interval=10s
 */

let currentState = {};

let currentPage: string;

const GLOBAL_STATE_CHANGED = 'monitoringStateChanged';
const GLOBAL_STATE_EVENT = new Event(GLOBAL_STATE_CHANGED);



export const getGlobalState = () => {
  const hashQuery = window.location.hash.substring(2);
  const [page, params] = hashQuery.split('?');
  currentPage = page;
  currentState = (params) ? qs.parse(params) : {};
  window.dispatchEvent(GLOBAL_STATE_EVENT);
  return currentState;
};

export const setGlobalState = () => {
  const params = qs.stringify(currentState);
  window.location.hash = `#/${currentPage || 'no-data'}?${params}`;
  return currentState;
};


//const removeHashChangeHandler = () => window.removeEventListener('hashchange', getGlobalState);
const addHashChangeHandler = () => window.addEventListener('hashchange', getGlobalState);

const apiPrefix = chrome.addBasePath('/api/monitoring/v1');

export class MonitoringState {

  private static stateContext: React.Context<any> = React.createContext(getGlobalState());
  private static trackedValue: unknown;

  public static useProvider = () => {
    const context = React.useContext(MonitoringState.stateContext);
    if (!context) {
      throw new Error('useProvider() must be used within <Provider> ... </Provider>');
    }
    return context;
  }

  public static Provider = (props: any) => {
    const [currentValue, setValue] = React.useState(MonitoringState.trackedValue);
    const value = React.useMemo(() => {
      MonitoringState.trackedValue = currentValue;
      return [currentValue, setValue];
    }, [currentValue]);

    const Context: React.Context<any> = MonitoringState.stateContext;
    return <Context.Provider value={value} {...props} />
  }



}