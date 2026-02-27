/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAction } from 'redux-actions';
import { createThunk } from '../../lib/create_thunk';

export const setFilter = createThunk('setFilter', ({ dispatch }, filter, elementId) => {
  const _setFilter = createAction('setFilter');
  dispatch(_setFilter({ filter, elementId }));
});
