/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  OPEN_DETAIL_PANEL,
  CLOSE_DETAIL_PANEL,
} from '../action_types';

const initialState = {
  isOpen: false,
  clusterName: undefined,
};

export function detailPanel(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case OPEN_DETAIL_PANEL:
      const {
        clusterName,
      } = payload;

      return {
        clusterName,
        isOpen: true,
      };

    case CLOSE_DETAIL_PANEL:
      return {
        clusterName: undefined,
        isOpen: false,
      };

    default:
      return state;
  }
}
