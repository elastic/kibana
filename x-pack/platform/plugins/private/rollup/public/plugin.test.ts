/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { CONFIG_ROLLUP_UI_ENABLED } from '../common';
import { RollupPlugin } from './plugin';

describe('RollupPlugin', () => {
  it.each([false, true])('registers its UI when the Advanced Setting is %s', (enabled) => {
    const core = coreMock.createSetup();
    const dataViews = dataViewPluginMocks.createSetupContract();
    const management = managementPluginMock.createSetupContract();
    core.uiSettings.get.mockReturnValue(enabled);

    new RollupPlugin().setup(core, { dataViews, management });

    expect(core.uiSettings.get).toHaveBeenCalledWith(CONFIG_ROLLUP_UI_ENABLED);
    expect(management.sections.section.data.registerApp).toHaveBeenCalledTimes(enabled ? 1 : 0);
    expect(dataViews.enableRollups).toHaveBeenCalledTimes(1);
  });
});
