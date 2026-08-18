/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context } from '@kbn/cordis';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/server/mocks';
import GlobalSearchProvidersPlugin from './plugin';

describe('GlobalSearchProvidersPlugin', () => {
  let ctx: Context;
  let globalSearchSetup: ReturnType<typeof globalSearchPluginMock.createSetupContract>;

  beforeEach(() => {
    ctx = new Context();
    globalSearchSetup = globalSearchPluginMock.createSetupContract();
    ctx.provide('globalSearch.setup', { contract: globalSearchSetup });
  });

  it('registers the `savedObjects` result provider', async () => {
    await ctx.plugin(GlobalSearchProvidersPlugin);

    expect(globalSearchSetup.registerResultProvider).toHaveBeenCalledTimes(1);
    expect(globalSearchSetup.registerResultProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'savedObjects',
      })
    );
  });
});
