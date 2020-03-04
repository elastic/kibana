/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Connector } from '../../../../containers/case/types';

export interface State {
  connectors: Connector[];
}

export interface Action {
  type: 'setConnectors';
  connectors: Connector[];
}

export const configureCasesReducer = () => (state: State, action: Action) => {
  switch (action.type) {
    case 'setConnectors': {
      return {
        ...state,
        connectors: action.connectors,
      };
    }
    default:
      return state;
  }
};
