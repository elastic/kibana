/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedSettingsService } from './advanced_settings_service';

describe('Advanced Settings Service', () => {
  describe('#setup', () => {
    it('registers space-aware components to augment the advanced settings screen', () => {
      const deps = {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'foo', name: 'foo-space' }),
        componentRegistry: {
          register: jest.fn(),
          get: jest.fn(),
          componentType: {
            PAGE_TITLE_COMPONENT: 'page_title_component',
            PAGE_SUBTITLE_COMPONENT: 'page_subtitle_component',
            PAGE_FOOTER_COMPONENT: 'page_footer_component',
          },
        },
      };

      const advancedSettingsService = new AdvancedSettingsService();
      advancedSettingsService.setup(deps);

      expect(deps.componentRegistry.register).toHaveBeenCalledTimes(2);
      expect(deps.componentRegistry.register).toHaveBeenCalledWith(
        'page_title_component',
        expect.any(Function),
        true
      );

      expect(deps.componentRegistry.register).toHaveBeenCalledWith(
        'page_subtitle_component',
        expect.any(Function),
        true
      );
    });
  });
});
