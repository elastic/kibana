/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ClosureType,
  CasesConfigurationMapping,
} from '../../../../containers/case/configure/types';

export interface State {
  mapping: CasesConfigurationMapping[] | null;
  connectorId: string;
  closureType: ClosureType;
  currentConfiguration: CurrentConfiguration;
}

export interface CurrentConfiguration {
  connectorId: State['connectorId'];
  closureType: State['closureType'];
}

export type Action =
  | {
      type: 'setCurrentConfiguration';
      currentConfiguration: CurrentConfiguration;
    }
  | {
      type: 'setConnectorId';
      connectorId: string;
    }
  | {
      type: 'setClosureType';
      closureType: ClosureType;
    }
  | {
      type: 'setMapping';
      mapping: CasesConfigurationMapping[];
    };

export const configureCasesReducer = () => (state: State, action: Action) => {
  switch (action.type) {
    case 'setCurrentConfiguration': {
      return {
        ...state,
        currentConfiguration: { ...action.currentConfiguration },
      };
    }
    case 'setConnectorId': {
      return {
        ...state,
        connectorId: action.connectorId,
      };
    }
    case 'setClosureType': {
      return {
        ...state,
        closureType: action.closureType,
      };
    }
    case 'setMapping': {
      return {
        ...state,
        mapping: action.mapping,
      };
    }
    default:
      return state;
  }
};
