/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';

export interface ActionState {
  action: any;
}

export const actionReducer = (state: any, actionItem: any) => {
  const { command, payload } = actionItem;
  const { action } = state;

  switch (command) {
    case 'setAction':
      return {
        ...state,
        action: payload,
      };
    case 'setProperty': {
      const { property, value } = payload;
      if (isEqual(action[property], value)) {
        return state;
      } else {
        return {
          ...state,
          action: {
            ...action,
            [property]: value,
          },
        };
      }
    }
    case 'setConfigProperty': {
      const { property, value } = payload;
      if (isEqual(action.config[property], value)) {
        return state;
      } else {
        return {
          ...state,
          action: {
            ...action,
            config: {
              ...action.config,
              [property]: value,
            },
          },
        };
      }
    }
    case 'setSecretsProperty': {
      const { property, value } = payload;
      if (isEqual(action.secrets[property], value)) {
        return state;
      } else {
        return {
          ...state,
          action: {
            ...action,
            secrets: {
              ...action.secrets,
              [property]: value,
            },
          },
        };
      }
    }
  }
};
