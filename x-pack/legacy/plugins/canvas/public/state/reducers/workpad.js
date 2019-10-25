/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { getCoreStart } from '../../legacy';
import { getDefaultWorkpad } from '../defaults';
import {
  setWorkpad,
  sizeWorkpad,
  setColors,
  setName,
  setWriteable,
  setWorkpadCSS,
  resetWorkpad,
} from '../actions/workpad';

import { APP_ROUTE_WORKPAD } from '../../../common/lib/constants';

export const workpadReducer = handleActions(
  {
    [setWorkpad]: (workpadState, { payload }) => {
      getCoreStart().chrome.recentlyAccessed.add(
        `${APP_ROUTE_WORKPAD}/${payload.id}`,
        payload.name,
        payload.id
      );
      return payload;
    },

    [sizeWorkpad]: (workpadState, { payload }) => {
      return { ...workpadState, ...payload };
    },

    [setColors]: (workpadState, { payload }) => {
      return { ...workpadState, colors: payload };
    },

    [setName]: (workpadState, { payload }) => {
      getCoreStart().chrome.recentlyAccessed.add(
        `${APP_ROUTE_WORKPAD}/${workpadState.id}`,
        payload,
        workpadState.id
      );
      return { ...workpadState, name: payload };
    },

    [setWriteable]: (workpadState, { payload }) => {
      return { ...workpadState, isWriteable: Boolean(payload) };
    },

    [setWorkpadCSS]: (workpadState, { payload }) => {
      return { ...workpadState, css: payload };
    },

    [resetWorkpad]: () => ({ ...getDefaultWorkpad() }),
  },
  {}
);
