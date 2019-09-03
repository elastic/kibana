/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { without, includes } from 'lodash';
import { getWorkpadColors } from '../selectors/workpad';
import { fetchAllRenderables } from './elements';

export const sizeWorkpad = createAction('sizeWorkpad');
export const setName = createAction('setName');
export const setWriteable = createAction('setWriteable');
export const setColors = createAction('setColors');
export const setRefreshInterval = createAction('setRefreshInterval');
export const setWorkpadCSS = createAction('setWorkpadCSS');
export const enableAutoplay = createAction('enableAutoplay');
export const setAutoplayInterval = createAction('setAutoplayInterval');
export const resetWorkpad = createAction('resetWorkpad');

export const initializeWorkpad = createThunk('initializeWorkpad', ({ dispatch }) => {
  dispatch(fetchAllRenderables());
});

export const addColor = createThunk('addColor', ({ dispatch, getState }, color) => {
  const colors = getWorkpadColors(getState()).slice(0);
  if (!includes(colors, color)) {
    colors.push(color);
  }
  dispatch(setColors(colors));
});

export const removeColor = createThunk('removeColor', ({ dispatch, getState }, color) => {
  dispatch(setColors(without(getWorkpadColors(getState()), color)));
});

export const setWorkpad = createThunk(
  'setWorkpad',
  ({ dispatch, type }, workpad, { loadPages = true } = {}) => {
    dispatch(createAction(type)(workpad)); // set the workpad object in state
    if (loadPages) {
      dispatch(initializeWorkpad());
    } // load all the elements on the workpad
  }
);
