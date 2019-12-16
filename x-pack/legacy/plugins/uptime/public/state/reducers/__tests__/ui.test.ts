/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionTypes } from '../../actions';
import { uiReducer } from '../ui';

describe('ui reducer', () => {
  it(`sets the application's base path`, () => {
    const action: UiActionTypes = {
      type: 'SET_BASE_PATH',
      payload: 'yyz',
    };
    expect(
      uiReducer(
        {
          basePath: 'abc',
          esKuery: '',
          integrationsPopoverOpen: null,
          lastRefresh: 125,
        },
        action
      )
    ).toMatchSnapshot();
  });

  it('adds integration popover status to state', () => {
    const action: UiActionTypes = {
      type: 'SET_INTEGRATION_POPOVER_STATE',
      payload: {
        id: 'popover-2',
        open: true,
      },
    };
    expect(
      uiReducer(
        {
          basePath: '',
          esKuery: '',
          integrationsPopoverOpen: null,
          lastRefresh: 125,
        },
        action
      )
    ).toMatchSnapshot();
  });

  it('updates the refresh value', () => {
    const action: UiActionTypes = {
      type: 'REFRESH_APP',
      payload: 125,
    };
    expect(uiReducer(undefined, action)).toMatchSnapshot();
  });
});
