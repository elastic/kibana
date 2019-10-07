import React from 'react';
import qs from 'querystring';


/**
 * #/pageId ?clusterUUID=23452a  &from=1512421234213  &to=1523452345434 &refresh=true &interval=10s
 */

let currentState = {};

let currentPage: string;

const getGlobalState = () => {
  const hashQuery = window.location.hash.substring(2);
  const [page, params] = hashQuery.split('?');
  currentPage = page;
  currentState = (params) ? qs.parse(params) : {};
  return currentState;
};

const setGlobalState = () => {
  const params = qs.stringify(currentState);
  window.location.hash = `#/${currentPage || 'no-data'}?${params}`;
  return currentState;
};

export class CreateStateProvider {

  private context: React.Context<any>;
  private trackedValue: unknown;

  constructor(defaultValue: unknown) {
    this.context = React.createContext(defaultValue);
    this.trackedValue = defaultValue;
  }

  public useProvider = () => {
    const context = React.useContext(this.context);
    if (!context) {
      throw new Error('useProvider() must be used within <Provider> ... </Provider>');
    }
    return context;
  }

  public provider = (props) => {
    const [currentValue, setValue] = React.useState(this.trackedValue);

    
    const value = React.useMemo(() => {
      this.trackedValue = currentValue;
      return [currentValue, setValue];
    }, [currentValue]);

    const Context = this.context;

    return <Context.Provider value={value} {...props} />
  }

}