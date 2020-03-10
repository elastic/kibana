/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CaseConfigureClosureType,
  CasesConfigurationMapping,
} from '../../../../containers/case/configure/types';

export interface State {
  mapping: CasesConfigurationMapping[] | null;
  connectorId: string;
  closureType: CaseConfigureClosureType;
}

export type Action =
  | {
      type: 'setConnectorId';
      connectorId: string;
    }
  | {
      type: 'setClosureType';
      closureType: CaseConfigureClosureType;
    }
  | {
      type: 'setMapping';
      mapping: CasesConfigurationMapping[];
    };

export const configureCasesReducer = () => (state: State, action: Action) => {
  switch (action.type) {
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
