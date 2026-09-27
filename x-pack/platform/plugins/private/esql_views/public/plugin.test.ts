/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { MANAGEMENT_APP_ID, PLUGIN_NAME } from '../common';
import { EsqlViewsPlugin } from './plugin';

jest.mock('@kbn/app-header', () => ({
  AppHeader: () => null,
}));

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: () => null,
}));

jest.mock('@kbn/esql-utils', () => ({
  createEsqlViewsManagementClient: () => ({
    getViews: jest.fn().mockResolvedValue({ views: [] }),
  }),
}));

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

  it('registers and mounts the management application when the UI is enabled', async () => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const management = managementPluginMock.createSetupContract();
    core.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    createPlugin(true).setup(core, { management });

    expect(management.sections.section.data.registerApp).toHaveBeenCalledWith({
      id: MANAGEMENT_APP_ID,
      title: PLUGIN_NAME,
      order: 2.1,
      keywords: ['esql', 'views'],
      mount: expect.any(Function),
    });

    const registerApp = management.sections.section.data.registerApp as jest.MockedFunction<
      typeof management.sections.section.data.registerApp
    >;
    const [[registeredApp]] = registerApp.mock.calls;
    const mountParams = {
      ...coreMock.createAppMountParameters(),
      basePath: '/',
      setBreadcrumbs: jest.fn(),
      theme: coreStart.theme,
    };
    let unmount: (() => void) | undefined;

    await act(async () => {
      unmount = await registeredApp.mount(mountParams);
    });

    expect(core.getStartServices).toHaveBeenCalledTimes(1);
    expect(mountParams.setBreadcrumbs).toHaveBeenCalledWith([{ text: PLUGIN_NAME }]);
    expect(
      mountParams.element.querySelector('[data-test-subj="esqlViewsManagementPage"]')
    ).not.toBe(null);

    act(() => unmount?.());
    expect(coreStart.chrome.docTitle.reset).toHaveBeenCalledTimes(1);
  });
});
