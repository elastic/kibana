/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAP_STATE, map } from './map';
import { SET_MAP_SETTINGS } from '../../actions/map_action_constants';

describe('SET_MAP_SETTINGS', () => {
  test('Should preserve previous settings when setting partial map settings', () => {
    const initialState = {
      ...DEFAULT_MAP_STATE,
    };
    initialState.settings.autoFitToDataBounds = false;
    initialState.settings.showTimesliderToggleButton = false;

    const updatedState1 = map(initialState, {
      type: SET_MAP_SETTINGS,
      settings: {
        autoFitToDataBounds: true,
      },
    });
    expect(updatedState1.settings.autoFitToDataBounds).toBe(true);
    expect(updatedState1.settings.showTimesliderToggleButton).toBe(false);

    const updatedState2 = map(updatedState1, {
      type: SET_MAP_SETTINGS,
      settings: {
        showTimesliderToggleButton: true,
      },
    });
    expect(updatedState2.settings.autoFitToDataBounds).toBe(true);
    expect(updatedState2.settings.showTimesliderToggleButton).toBe(true);
  });
});
