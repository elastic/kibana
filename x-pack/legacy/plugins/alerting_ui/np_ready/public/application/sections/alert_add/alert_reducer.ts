/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';

export interface AlertState {
  alert: any;
}

export const alertReducer = (state: any, action: any) => {
  const { command, payload } = action;
  const { alert } = state;

  switch (command) {
    case 'setAlert':
      return {
        ...state,
        alert: payload,
      };
  }
};
