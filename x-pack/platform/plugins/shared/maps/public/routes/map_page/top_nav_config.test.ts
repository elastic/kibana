/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../kibana_services', () => ({
  getMapsCapabilities: () => ({ save: false }),
  getInspector: () => ({ open: jest.fn() }),
  getCore: () => ({}),
  getCoreOverlays: () => ({}),
  getNavigateToApp: () => jest.fn(),
  getSavedObjectsTagging: () => null,
}));
jest.mock('@kbn/saved-objects-plugin/public', () => ({}));
jest.mock('@kbn/presentation-util-plugin/public', () => ({}));
jest.mock('./saved_map', () => ({
  unsavedChangesTitle: 'Unsaved changes',
  unsavedChangesWarning: 'You have unsaved changes',
}));
jest.mock('../../content_management', () => ({
  hasLibraryItemWithTitle: jest.fn(),
}));

import { getMapsAppHeaderMenu } from './top_nav_config';
import type { SavedMap } from './saved_map';

const mockSavedMap = {
  hasSaveAndReturnConfig: () => false,
} as unknown as SavedMap;

describe('getMapsAppHeaderMenu', () => {
  test('should include full screen button', () => {
    const result = getMapsAppHeaderMenu({
      savedMap: mockSavedMap,
      isOpenSettingsDisabled: false,
      isSaveDisabled: false,
      enableFullScreen: jest.fn(),
      openMapSettings: jest.fn(),
      inspectorAdapters: {} as any,
      history: {} as any,
    });

    const fullScreenItem = result?.items?.find((item) => item.testId === 'mapsFullScreenMode');
    expect(fullScreenItem).toBeDefined();
  });

  test('full screen button should call enableFullScreen when run', () => {
    const enableFullScreen = jest.fn();
    const result = getMapsAppHeaderMenu({
      savedMap: mockSavedMap,
      isOpenSettingsDisabled: false,
      isSaveDisabled: false,
      enableFullScreen,
      openMapSettings: jest.fn(),
      inspectorAdapters: {} as any,
      history: {} as any,
    });

    const fullScreenItem = result?.items?.find((item) => item.testId === 'mapsFullScreenMode');
    fullScreenItem?.run?.(null as any);
    expect(enableFullScreen).toHaveBeenCalledTimes(1);
  });
});
