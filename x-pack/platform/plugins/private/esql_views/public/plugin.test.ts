/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { EsqlViewsPlugin } from './plugin';

const createPlugin = (enabled: boolean) =>
  new EsqlViewsPlugin(
    coreMock.createPluginInitializerContext({
      managementUi: { enabled },
    })
  );

describe('EsqlViewsPlugin', () => {
  it('does not register the management application when the UI is disabled', () => {
    const management = managementPluginMock.createSetupContract();

    createPlugin(false).setup(coreMock.createSetup(), { management });

    expect(management.sections.section.data.registerApp).not.toHaveBeenCalled();
  });

  it('registers the management application when the UI is enabled', () => {
    const management = managementPluginMock.createSetupContract();

    createPlugin(true).setup(coreMock.createSetup(), { management });

    expect(management.sections.section.data.registerApp).toHaveBeenCalledWith({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 2.1,
      keywords: ['esql', 'views'],
      mount: expect.any(Function),
    });
  });
});
