/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';

interface CommandType {
  type: 'setProperty' | 'setConfigProperty' | 'setSecretsProperty';
}

export interface ActionState {
  connector: any;
}

export interface ReducerAction {
  command: CommandType;
  payload: {
    key: string;
    value: any;
  };
}

export const connectorReducer = (state: ActionState, action: ReducerAction) => {
  const { command, payload } = action;
  const { connector } = state;

  switch (command.type) {
    case 'setProperty': {
      const { key, value } = payload;
      if (isEqual(connector[key], value)) {
        return state;
      } else {
        return {
          ...state,
          connector: {
            ...connector,
            [key]: value,
          },
        };
      }
    }
    case 'setConfigProperty': {
      const { key, value } = payload;
      if (isEqual(connector.config[key], value)) {
        return state;
      } else {
        return {
          ...state,
          connector: {
            ...connector,
            config: {
              ...connector.config,
              [key]: value,
            },
          },
        };
      }
    }
    case 'setSecretsProperty': {
      const { key, value } = payload;
      if (isEqual(connector.secrets[key], value)) {
        return state;
      } else {
        return {
          ...state,
          connector: {
            ...connector,
            secrets: {
              ...connector.secrets,
              [key]: value,
            },
          },
        };
      }
    }
  }
};
