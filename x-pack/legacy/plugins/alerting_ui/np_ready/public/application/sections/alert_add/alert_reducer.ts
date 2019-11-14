/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';

interface CommandType {
  type: 'setAlert' | 'setProperty' | 'setAlertTypeParams';
}

export interface AlertState {
  alert: any;
}

export interface ActionAlertReducerItem {
  command: CommandType;
  payload: {
    key: string;
    value: {};
  };
}

export const alertReducer = (state: any, action: ActionAlertReducerItem) => {
  const { command, payload } = action;
  const { alert } = state;

  switch (command.type) {
    case 'setAlert': {
      const { key, value } = payload;
      if (key === 'action') {
        return {
          ...state,
          alert: value,
        };
      } else {
        return state;
      }
    }
    case 'setProperty': {
      const { key, value } = payload;
      if (isEqual(alert[key], value)) {
        return state;
      } else {
        return {
          ...state,
          alert: {
            ...alert,
            [key]: value,
          },
        };
      }
    }
    case 'setAlertTypeParams': {
      const { key, value } = payload;
      if (isEqual(alert.alertTypeParams[key], value)) {
        return state;
      } else {
        return {
          ...state,
          alert: {
            ...alert,
            alertTypeParams: {
              ...alert.alertTypeParams,
              [key]: value,
            },
          },
        };
      }
    }
  }
};
