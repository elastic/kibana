/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAction } from 'redux-v4';
import type { Middleware } from 'redux-v4';
import { getRouter, getUserHasLeftApp } from '../../services';
import { CLOSE_DETAIL_PANEL } from '../action_types';
import type { RemoteClustersState } from '../types';

export const detailPanel: Middleware<{}, RemoteClustersState> = () => (next) => (action) => {
  if (isAction(action) && action.type === CLOSE_DETAIL_PANEL && !getUserHasLeftApp()) {
    const { history } = getRouter();

    // Persist state to query params by removing deep link.
    history.replace({
      search: '',
    });
  }

  return next(action);
};
