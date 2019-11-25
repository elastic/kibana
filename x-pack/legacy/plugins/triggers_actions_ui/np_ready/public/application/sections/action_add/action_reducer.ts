/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';

interface CommandType {
  type: 'setAction' | 'setProperty' | 'setConfigProperty' | 'setSecretsProperty';
}

export interface ActionState {
  action: any;
}

export interface ActionReducerItem {
  command: CommandType;
  payload: {
    key: string;
    value: {};
  };
}

export const actionReducer = (state: ActionState, actionItem: ActionReducerItem) => {
  const { command, payload } = actionItem;
  const { action } = state;

  switch (command.type) {
    case 'setAction': {
      const { key, value } = payload;
      if (key === 'action') {
        return {
          ...state,
          action: value,
        };
      } else {
        return state;
      }
    }
    case 'setProperty': {
      const { key, value } = payload;
      if (isEqual(action[key], value)) {
        return state;
      } else {
        return {
          ...state,
          action: {
            ...action,
            [key]: value,
          },
        };
      }
    }
    case 'setConfigProperty': {
      const { key, value } = payload;
      if (isEqual(action.config[key], value)) {
        return state;
      } else {
        return {
          ...state,
          action: {
            ...action,
            config: {
              ...action.config,
              [key]: value,
            },
          },
        };
      }
    }
    case 'setSecretsProperty': {
      const { key, value } = payload;
      if (isEqual(action.secrets[key], value)) {
        return state;
      } else {
        return {
          ...state,
          action: {
            ...action,
            secrets: {
              ...action.secrets,
              [key]: value,
            },
          },
        };
      }
    }
  }
};
