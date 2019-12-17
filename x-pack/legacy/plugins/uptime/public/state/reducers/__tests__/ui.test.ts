/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  setBasePath,
  toggleIntegrationsPopover,
  triggerAppRefresh,
  setFilters,
} from '../../actions';
import { uiReducer } from '../ui';
import { Action } from 'redux-actions';

describe('ui reducer', () => {
  it(`sets the application's base path`, () => {
    const action = setBasePath('yyz') as Action<never>;
    expect(
      uiReducer(
        {
          basePath: 'abc',
          integrationsPopoverOpen: null,
          lastRefresh: 125,
          filters: new Map([['observer.geo.name', ['Tokyo', 'London', 'Karachi']]]),
        },
        action
      )
    ).toMatchSnapshot();
  });

  it('adds integration popover status to state', () => {
    const action = toggleIntegrationsPopover({
      id: 'popover-2',
      open: true,
    }) as Action<never>;
    expect(
      uiReducer(
        {
          basePath: '',
          integrationsPopoverOpen: null,
          lastRefresh: 125,
          filters: new Map([['observer.geo.name', ['Tokyo', 'London', 'Karachi']]]),
        },
        action
      )
    ).toMatchSnapshot();
  });

  it('updates the refresh value', () => {
    const action = triggerAppRefresh(125) as Action<never>;
    expect(
      uiReducer(
        {
          basePath: 'abc',
          integrationsPopoverOpen: null,
          lastRefresh: 125,
          filters: new Map([['observer.geo.name', ['Tokyo', 'London', 'Karachi']]]),
        },
        action
      )
    ).toMatchSnapshot();
  });

  it('updates the filter value', () => {
    const action = setFilters(
      new Map([['observer.geo.name', ['Tokyo', 'London', 'Karachi']]])
    ) as Action<never>;
    expect(
      uiReducer(
        {
          basePath: '',
          integrationsPopoverOpen: null,
          lastRefresh: 125,
          filters: new Map([['observer.geo.name', ['Tokyo', 'London']]]),
        },
        action
      )
    ).toMatchSnapshot();
  });
});
