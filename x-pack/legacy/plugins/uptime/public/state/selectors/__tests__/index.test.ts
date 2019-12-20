/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBasePath, isIntegrationsPopupOpen } from '../index';
import { AppState } from '../../../state';

describe('state selectors', () => {
  const state: AppState = {
    monitor: {
      monitorDetailsList: [],
      monitorLocationsList: new Map(),
      loading: false,
      errors: [],
    },
    snapshot: {
      count: {
        up: 2,
        down: 0,
        total: 2,
      },
      errors: [],
      loading: false,
    },
    ui: { basePath: 'yyz', integrationsPopoverOpen: null, lastRefresh: 125 },
  };

  it('selects base path from state', () => {
    expect(getBasePath(state)).toBe('yyz');
  });

  it('gets integrations popup state', () => {
    const integrationsPopupOpen = {
      id: 'popup-id',
      open: true,
    };
    state.ui.integrationsPopoverOpen = integrationsPopupOpen;
    expect(isIntegrationsPopupOpen(state)).toBe(integrationsPopupOpen);
  });
});
