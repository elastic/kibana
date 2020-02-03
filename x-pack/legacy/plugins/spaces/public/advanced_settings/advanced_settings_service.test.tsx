/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedSettingsService } from './advanced_settings_service';
jest.mock('ui/management', () => {
  return {
    PAGE_TITLE_COMPONENT: 'page_title_component',
    PAGE_SUBTITLE_COMPONENT: 'page_subtitle_component',
  };
});

describe('Advanced Settings Service', () => {
  describe('#setup', () => {
    it('registers space-aware components to augment the advanced settings screen', () => {
      const deps = {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'foo', name: 'foo-space' }),
        registerSettingsComponent: jest.fn(),
      };

      const advancedSettingsService = new AdvancedSettingsService();
      advancedSettingsService.setup(deps);

      expect(deps.registerSettingsComponent).toHaveBeenCalledTimes(2);
      expect(deps.registerSettingsComponent).toHaveBeenCalledWith(
        'page_title_component',
        expect.any(Function),
        true
      );

      expect(deps.registerSettingsComponent).toHaveBeenCalledWith(
        'page_subtitle_component',
        expect.any(Function),
        true
      );
    });
  });
});
