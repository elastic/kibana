/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { GlobalSearchBarPlugin } from './plugin';

describe('GlobalSearchBarPlugin', () => {
  describe('start', () => {
    it('registers nav controls', async () => {
      const coreSetup = coreMock.createSetup();

      const service = new GlobalSearchBarPlugin(
        coreMock.createPluginInitializerContext({
          input_max_limit: 2000,
        })
      );

      service.setup(coreSetup);

      const coreStart = coreMock.createStart();

      const navControlsRegisterSpy = jest.spyOn(coreStart.chrome.navControls, 'registerCenter');

      const start = service.start(coreStart, {
        globalSearch: globalSearchPluginMock.createStartContract(),
      });

      expect(start).toEqual({});

      expect(navControlsRegisterSpy).toHaveBeenCalled();
    });
  });
});
