/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBasePath, isIntegrationsPopupOpen, getFilters } from '../index';
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
        mixed: 0,
        total: 2,
      },
      errors: [],
      loading: false,
    },
    ui: {
      basePath: 'yyz',
      integrationsPopoverOpen: null,
      lastRefresh: 125,
      filters: new Map([['observer.geo.name', ['Tokyo', 'London', 'Karachi']]]),
    },
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

  it('get filter from ui state', () => {
    const filters = new Map([['observer.geo.name', ['Tokyo', 'London', 'Karachi']]]);
    state.ui.filters = filters;
    expect(getFilters(state)).toBe(filters);
  });
});
