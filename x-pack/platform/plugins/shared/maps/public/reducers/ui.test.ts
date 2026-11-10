/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../kibana_services', () => ({
  getMapsCapabilities: () => ({ save: true }),
}));

jest.mock('../actions', () => ({
  UPDATE_FLYOUT: 'UPDATE_FLYOUT',
  SET_IS_LAYER_TOC_OPEN: 'SET_IS_LAYER_TOC_OPEN',
  SET_IS_TIME_SLIDER_OPEN: 'SET_IS_TIME_SLIDER_OPEN',
  SET_FULL_SCREEN: 'SET_FULL_SCREEN',
  SET_READ_ONLY: 'SET_READ_ONLY',
  SET_OPEN_TOC_DETAILS: 'SET_OPEN_TOC_DETAILS',
  SHOW_TOC_DETAILS: 'SHOW_TOC_DETAILS',
  HIDE_TOC_DETAILS: 'HIDE_TOC_DETAILS',
  SET_DRAW_MODE: 'SET_DRAW_MODE',
  SET_AUTO_OPEN_WIZARD_ID: 'SET_AUTO_OPEN_WIZARD_ID',
  PUSH_DELETED_FEATURE_ID: 'PUSH_DELETED_FEATURE_ID',
  CLEAR_DELETED_FEATURE_IDS: 'CLEAR_DELETED_FEATURE_IDS',
}));

import { ui, DEFAULT_MAP_UI_STATE } from './ui';

describe('ui reducer full screen', () => {
  test('should set isFullScreen to true when enableFullScreen is dispatched', () => {
    const state = ui(DEFAULT_MAP_UI_STATE, { type: 'SET_FULL_SCREEN', isFullScreen: true });
    expect(state.isFullScreen).toBe(true);
  });

  test('should set isFullScreen to false when exitFullScreen is dispatched', () => {
    const fullScreenState = { ...DEFAULT_MAP_UI_STATE, isFullScreen: true };
    const state = ui(fullScreenState, { type: 'SET_FULL_SCREEN', isFullScreen: false });
    expect(state.isFullScreen).toBe(false);
  });
});
