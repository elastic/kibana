/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPEN_DETAIL_PANEL, CLOSE_DETAIL_PANEL } from '../action_types';
import type { DetailPanelState, RemoteClustersAction } from '../types';

const initialState: DetailPanelState = {
  isOpen: false,
  clusterName: undefined,
};

export function detailPanel(state = initialState, action: RemoteClustersAction): DetailPanelState {
  switch (action.type) {
    case OPEN_DETAIL_PANEL:
      const { clusterName } = action.payload;

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
