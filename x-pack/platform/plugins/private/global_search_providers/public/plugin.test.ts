/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { GlobalSearchProvidersPlugin } from './plugin';

describe('GlobalSearchProvidersPlugin', () => {
  let plugin: GlobalSearchProvidersPlugin;
  let globalSearchSetup: ReturnType<typeof globalSearchPluginMock.createSetupContract>;

  beforeEach(() => {
    globalSearchSetup = globalSearchPluginMock.createSetupContract();
    plugin = new GlobalSearchProvidersPlugin();
  });

  describe('#setup', () => {
    it('registers the `application` result provider', () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup, { globalSearch: globalSearchSetup });

      expect(globalSearchSetup.registerResultProvider).toHaveBeenCalledTimes(1);
      expect(globalSearchSetup.registerResultProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'application',
        })
      );
    });
  });
});
