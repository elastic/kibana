/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { ESQL_VIEWS_CAPABILITIES, MANAGEMENT_APP_ID, PLUGIN_ID, PLUGIN_NAME } from '../common';
import { EsqlViewsPlugin } from './plugin';

// jest.fn so capability tests can inspect the menu prop it receives.
const AppHeaderMock = jest.fn(() => null);
jest.mock('@kbn/app-header', () => ({ AppHeader: AppHeaderMock }));

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: () => null,
}));

jest.mock('@kbn/esql-language', () => ({
  shouldBeQuotedSource: () => false,
}));

// One view so the table renders after mount, enabling DOM assertions.
jest.mock('@kbn/esql-utils', () => ({
  createEsqlViewsManagementClient: () => ({
    getViews: jest.fn().mockResolvedValue({ views: [{ name: 'logs-view', query: 'FROM logs-*' }] }),
    deleteViews: jest.fn(),
  }),
}));

const createPlugin = (enabled: boolean) =>
  new EsqlViewsPlugin(
    coreMock.createPluginInitializerContext({
      managementUi: { enabled },
    })
  );

const mountApp = async (capabilities: Record<string, boolean>) => {
  const core = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = {
    ...coreStart.application.capabilities,
    [PLUGIN_ID]: capabilities,
  };
  const management = managementPluginMock.createSetupContract();
  const data = dataPluginMock.createStartContract();
  const share = sharePluginMock.createStartContract();
  core.getStartServices.mockResolvedValue([coreStart, { data, share }, undefined]);

  createPlugin(true).setup(core, { management });

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
  // Flush async state updates (getViews resolving after mount).
  await act(async () => {});

  return { element: mountParams.element, unmount: () => act(() => unmount?.()) };
};

describe('EsqlViewsPlugin', () => {
  it('does not register the management application when the UI is disabled', () => {
    const management = managementPluginMock.createSetupContract();

    createPlugin(false).setup(coreMock.createSetup(), { management });

    expect(management.sections.section.data.registerApp).not.toHaveBeenCalled();
  });

  it('registers and mounts the management application when the UI is enabled', async () => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const data = dataPluginMock.createStartContract();
    const management = managementPluginMock.createSetupContract();
    const share = sharePluginMock.createStartContract();
    const getLocator = jest.spyOn(share.url.locators, 'get');
    core.getStartServices.mockResolvedValue([coreStart, { data, share }, undefined]);

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
    expect(getLocator).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
    expect(mountParams.setBreadcrumbs).toHaveBeenCalledWith([{ text: PLUGIN_NAME }]);
    expect(
      mountParams.element.querySelector('[data-test-subj="esqlViewsManagementPage"]')
    ).not.toBe(null);

    act(() => unmount?.());
    expect(coreStart.chrome.docTitle.reset).toHaveBeenCalledTimes(1);
  });

  // These tests mount the app via the real plugin path and read capabilities from
  // coreStart.application.capabilities[PLUGIN_ID], verifying that a wrong feature ID
  // or capability key in application.tsx would be caught even if component tests pass.
  describe('capability to control mapping', () => {
    beforeEach(() => AppHeaderMock.mockClear());

    it('shows the Create action when the create capability is granted', async () => {
      const { unmount } = await mountApp({ [ESQL_VIEWS_CAPABILITIES.create]: true });
      try {
        expect(AppHeaderMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            menu: expect.objectContaining({
              primaryActionItem: expect.objectContaining({ testId: 'esqlViewsCreateButton' }),
            }),
          }),
          expect.anything()
        );
      } finally {
        await unmount();
      }
    });

    it('hides the Create action when the create capability is not granted', async () => {
      const { unmount } = await mountApp({ [ESQL_VIEWS_CAPABILITIES.create]: false });
      try {
        expect(AppHeaderMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ menu: undefined }),
          expect.anything()
        );
      } finally {
        await unmount();
      }
    });

    it('shows only the Edit action when the edit capability is granted', async () => {
      const { element, unmount } = await mountApp({
        [ESQL_VIEWS_CAPABILITIES.edit]: true,
        [ESQL_VIEWS_CAPABILITIES.delete]: false,
      });
      try {
        expect(element.querySelector('[data-test-subj="esqlViewsTable"]')).not.toBe(null);
        await act(async () => {
          element.querySelector<HTMLElement>('[data-test-subj="esqlViewsActionsButton"]')?.click();
        });
        expect(document.body.querySelector('[data-test-subj="esqlViewsEditButton"]')).not.toBe(
          null
        );
        expect(document.body.querySelector('[data-test-subj="esqlViewsDeleteButton"]')).toBe(null);
      } finally {
        await unmount();
      }
    });

    it('shows only the Delete action when the delete capability is granted', async () => {
      const { element, unmount } = await mountApp({
        [ESQL_VIEWS_CAPABILITIES.edit]: false,
        [ESQL_VIEWS_CAPABILITIES.delete]: true,
      });
      try {
        expect(element.querySelector('[data-test-subj="esqlViewsTable"]')).not.toBe(null);
        await act(async () => {
          element.querySelector<HTMLElement>('[data-test-subj="esqlViewsActionsButton"]')?.click();
        });
        expect(document.body.querySelector('[data-test-subj="esqlViewsDeleteButton"]')).not.toBe(
          null
        );
        expect(document.body.querySelector('[data-test-subj="esqlViewsEditButton"]')).toBe(null);
      } finally {
        await unmount();
      }
    });

    it('hides the row actions button when neither edit nor delete is granted', async () => {
      const { element, unmount } = await mountApp({
        [ESQL_VIEWS_CAPABILITIES.edit]: false,
        [ESQL_VIEWS_CAPABILITIES.delete]: false,
      });
      try {
        expect(element.querySelector('[data-test-subj="esqlViewsTable"]')).not.toBe(null);
        expect(element.querySelector('[data-test-subj="esqlViewsActionsButton"]')).toBe(null);
      } finally {
        await unmount();
      }
    });

    it('shows row selection checkboxes when the delete capability is granted', async () => {
      const { element, unmount } = await mountApp({ [ESQL_VIEWS_CAPABILITIES.delete]: true });
      try {
        expect(
          element.querySelector('[data-test-subj="esqlViewsTable"] input[type="checkbox"]')
        ).not.toBe(null);
      } finally {
        await unmount();
      }
    });

    it('hides row selection checkboxes when the delete capability is not granted', async () => {
      const { element, unmount } = await mountApp({ [ESQL_VIEWS_CAPABILITIES.delete]: false });
      try {
        expect(element.querySelector('[data-test-subj="esqlViewsTable"]')).not.toBe(null);
        expect(
          element.querySelector('[data-test-subj="esqlViewsTable"] input[type="checkbox"]')
        ).toBe(null);
      } finally {
        await unmount();
      }
    });
  });
});
