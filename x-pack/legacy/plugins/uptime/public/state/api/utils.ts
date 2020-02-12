/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApiPath } from '../../lib/helper';
import { AppState, store } from '../index';

function select(state: AppState) {
  return state.ui.basePath;
}

export const fetchGet = async (apiUrl: string) => {
  const basePath = select(store.getState());

  const url = getApiPath(apiUrl, basePath);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return await response.json();
};
