/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { AppContextProvider } from '../../../../app_context';
import type { AppDependencies } from '../../../../app_context';
import { IndexActionsContextMenu } from './index_actions_context_menu';
import type { Index } from '@kbn/index-management-shared-types';
import { notificationService } from '../../../../services/notification';
import { navigateToIndexDetailsPage, getIndexDetailsLink } from '../../../../services/routing';

const user = userEvent.setup();

jest.mock('../../../../services/routing', () => ({
  ...jest.requireActual('../../../../services/routing'),
  getIndexDetailsLink: jest.fn(() => '/indices/some/stats'),
  navigateToIndexDetailsPage: jest.fn(),
}));

jest.mock('../../../../services/notification', () => ({
  ...jest.requireActual('../../../../services/notification'),
  notificationService: {
    showSuccessToast: jest.fn(),
    showDangerToast: jest.fn(),
  },
}));

jest.mock(
  '../details_page/convert_to_lookup_index_modal/convert_to_lookup_index_modal_container',
  () => ({
    ...jest.requireActual(
      '../details_page/convert_to_lookup_index_modal/convert_to_lookup_index_modal_container'
    ),
    ConvertToLookupIndexModalContainer: ({
      onCloseModal,
      onSuccess,
    }: {
      onCloseModal: () => void;
      onSuccess: (lookupIndexName: string) => void;
    }) => (
      <div data-test-subj="mockConvertToLookup">
        <button data-test-subj="convert-success" onClick={() => onSuccess('lookup-my-index')} />
        <button data-test-subj="convert-close" onClick={onCloseModal} />
      </div>
    ),
  })
);

const getIndexManagementCtx = (overrides: Partial<AppDependencies> = {}): AppDependencies => {
  const base: AppDependencies = {
    core: {
      fatalErrors: {} as unknown as AppDependencies['core']['fatalErrors'],
      getUrlForApp: jest.fn(),
      executionContext: {} as unknown as AppDependencies['core']['executionContext'],
      application: {} as unknown as AppDependencies['core']['application'],
      http: {} as unknown as AppDependencies['core']['http'],
      i18n: {} as unknown as AppDependencies['core']['i18n'],
      theme: {} as unknown as AppDependencies['core']['theme'],
      chrome: {} as unknown as AppDependencies['core']['chrome'],
    },
    plugins: {
      usageCollection: {} as unknown as AppDependencies['plugins']['usageCollection'],
      isFleetEnabled: false,
      share: {
        url: { locators: { get: () => ({ navigate: jest.fn() }) } },
      } as unknown as AppDependencies['plugins']['share'],
      cloud: undefined,
      console: undefined,
      licensing: undefined,
      ml: undefined,
      streams: undefined,
      reindexService: {} as unknown as AppDependencies['plugins']['reindexService'],
    },
    services: {
      // Only actions are used here
      extensionsService: {
        actions: [],
        columns: [],
        banners: [],
        toggles: [],
      } as unknown as AppDependencies['services']['extensionsService'],
      uiMetricService: {} as unknown as AppDependencies['services']['uiMetricService'],
      httpService: {} as unknown as AppDependencies['services']['httpService'],
      notificationService,
    },
    config: {
      enableIndexActions: true,
      enableLegacyTemplates: true,
      enableIndexStats: true,
      enableSizeAndDocCount: true,
      enableDataStreamStats: true,
      editableIndexSettings: 'all',
      enableMappingsSourceFieldSection: true,
      enableTogglingDataRetention: true,
      enableProjectLevelRetentionChecks: true,
      enableSemanticText: false,
      enforceAdaptiveAllocations: false,
    },
    history: { push: jest.fn() } as unknown as AppDependencies['history'],
    setBreadcrumbs: jest.fn(),
    uiSettings: {} as unknown as AppDependencies['uiSettings'],
    settings: {} as unknown as AppDependencies['settings'],
    url: {
      locators: { get: () => ({ navigate: jest.fn() }) },
    } as unknown as AppDependencies['url'],
    docLinks: {} as unknown as AppDependencies['docLinks'],
    kibanaVersion: {} as unknown as AppDependencies['kibanaVersion'],
    overlays: {} as unknown as AppDependencies['overlays'],
    canUseSyntheticSource: false,
    privs: { monitor: true, manageEnrich: true, monitorEnrich: true, manageIndexTemplates: true },
  };

  return { ...base, ...overrides } as AppDependencies;
};

type MenuProps = React.ComponentProps<typeof IndexActionsContextMenu>;

const getBaseProps = (): MenuProps => {
  const indexName = 'index-1';
  return {
    // One selected index by default
    indexNames: [indexName],
    indices: [
      {
        name: indexName,
        status: 'open' as Index['status'],
        documents: 100,
        primary: 1,
        hidden: false,
        aliases: [],
        isFrozen: false,
      } satisfies Partial<Index>,
    ] as Index[],
    isOnListView: true,
    resetSelection: jest.fn(),
    // All actions mocked
    closeIndices: jest.fn(async () => {}),
    openIndices: jest.fn(async () => {}),
    flushIndices: jest.fn(async () => {}),
    refreshIndices: jest.fn(async () => {}),
    clearCacheIndices: jest.fn(async () => {}),
    forcemergeIndices: jest.fn(async (_: string) => {}),
    deleteIndices: jest.fn(async () => {}),
    indexStatusByName: { [indexName]: 'open' as Index['status'] },
    performExtensionAction: jest.fn(async () => {}),
    reloadIndices: jest.fn(),
    fill: true,
    isLoading: false,
    indicesListURLParams: '?foo=bar',
  } as MenuProps;
};

const renderWithProviders = (ui: React.ReactElement, ctx?: Partial<AppDependencies>) => {
  const value = getIndexManagementCtx(ctx);
  return render(
    <I18nProvider>
      <AppContextProvider value={value}>{ui}</AppContextProvider>
    </I18nProvider>
  );
};

const openContextMenu = async () => {
  const btns = await screen.findAllByTestId('indexActionsContextMenuButton');
  await user.click(btns[btns.length - 1]);
};

describe('IndexActionsContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN rendering the component', () => {
    describe('AND WHEN single index is selected', () => {
      it('SHOULD render with correct default label', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        const button = await screen.findByLabelText(/index options/i);
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(/manage index/i);
      });

      it('SHOULD open menu and display all available actions', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        await openContextMenu();

        const menu = await screen.findByTestId('indexContextMenu');
        expect(menu).toBeInTheDocument();

        // Verify navigation actions
        expect(await within(menu).findByText(/show index overview/i)).toBeInTheDocument();
        expect(await within(menu).findByText(/show index settings/i)).toBeInTheDocument();
        expect(await within(menu).findByText(/show index mapping/i)).toBeInTheDocument();
        expect(await within(menu).findByText(/show index stats/i)).toBeInTheDocument();

        // Verify action buttons
        expect(await within(menu).findByTestId('closeIndexMenuButton')).toBeInTheDocument();
        expect(await within(menu).findByText(/force merge index/i)).toBeInTheDocument();
        expect(await within(menu).findByText(/refresh index/i)).toBeInTheDocument();
        expect(await within(menu).findByText(/clear index cache/i)).toBeInTheDocument();
        expect(await within(menu).findByText(/flush index/i)).toBeInTheDocument();
        expect(await within(menu).findByText(/delete index/i)).toBeInTheDocument();
      });
    });

    describe('AND WHEN multiple indices are selected', () => {
      it('SHOULD render pluralized label', async () => {
        const base = getBaseProps();
        const props: MenuProps = {
          ...base,
          indexNames: ['a', 'b'],
          indices: [
            {
              name: 'a',
              status: 'open' as Index['status'],
              documents: 1,
              primary: 1,
              aliases: [],
              hidden: false,
              isFrozen: false,
            } satisfies Partial<Index>,
            {
              name: 'b',
              status: 'open' as Index['status'],
              documents: 2,
              primary: 1,
              aliases: [],
              hidden: false,
              isFrozen: false,
            } satisfies Partial<Index>,
          ] as Index[],
          indexStatusByName: { a: 'open' as Index['status'], b: 'open' as Index['status'] },
        };

        renderWithProviders(<IndexActionsContextMenu {...props} />);

        const button = await screen.findByLabelText(/indices options/i);
        expect(button).toHaveTextContent(/manage \d+ indices/i);
      });
    });
  });

  describe('WHEN interacting with index state actions', () => {
    describe('AND WHEN index is open', () => {
      it('SHOULD show Close action and call callback', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        await openContextMenu();
        const closeBtn = await screen.findByTestId('closeIndexMenuButton');

        await user.click(closeBtn);

        expect(props.closeIndices).toHaveBeenCalledTimes(1);
        expect(props.resetSelection).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND WHEN index is closed', () => {
      it('SHOULD show Open action and call callback', async () => {
        const props = getBaseProps();
        const closed = {
          ...props,
          indexStatusByName: { 'index-1': 'close' as Index['status'] } as Record<
            string,
            Index['status']
          >,
        };
        renderWithProviders(<IndexActionsContextMenu {...closed} />);

        await openContextMenu();
        const openBtn = await screen.findByTestId('openIndexMenuButton');

        await user.click(openBtn);

        expect(props.openIndices).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('WHEN performing common index operations', () => {
    describe('AND WHEN clicking Refresh', () => {
      it('SHOULD call refreshIndices callback', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        await openContextMenu();
        const menu = await screen.findByTestId('indexContextMenu');
        const refreshBtn = await within(menu).findByText(/refresh index/i);

        await user.click(refreshBtn);

        expect(props.refreshIndices).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND WHEN clicking Clear Cache', () => {
      it('SHOULD call clearCacheIndices callback', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        await openContextMenu();
        const menu = await screen.findByTestId('indexContextMenu');
        const clearBtn = await within(menu).findByText(/clear index cache/i);

        await user.click(clearBtn);

        expect(props.clearCacheIndices).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND WHEN clicking Flush', () => {
      it('SHOULD call flushIndices callback', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        await openContextMenu();
        const menu = await screen.findByTestId('indexContextMenu');
        const flushBtn = await within(menu).findByText(/flush index/i);

        await user.click(flushBtn);

        expect(props.flushIndices).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('WHEN using Force Merge action', () => {
    describe('AND WHEN opening force merge from the menu', () => {
      it('SHOULD open the force merge modal', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        await openContextMenu();
        const menu = await screen.findByTestId('indexContextMenu');
        const forcemergeBtn = await within(menu).findByText(/force merge index/i);

        await user.click(forcemergeBtn);

        expect(await screen.findByTestId('indexActionsForcemergeNumSegments')).toBeInTheDocument();
      });
    });
  });

  describe('WHEN using Delete action', () => {
    describe('AND WHEN clicking Delete in the menu', () => {
      it('SHOULD open the delete confirmation modal', async () => {
        const props = getBaseProps();
        renderWithProviders(<IndexActionsContextMenu {...props} />);

        await openContextMenu();
        const menu = await screen.findByTestId('indexContextMenu');
        const deleteBtn = await within(menu).findByText(/delete index/i);

        await user.click(deleteBtn);

        expect(await screen.findByTestId('confirmModalConfirmButton')).toBeInTheDocument();
      });
    });
  });

  describe('WHEN navigating to index detail pages', () => {
    describe('AND WHEN clicking Overview/Settings/Mapping', () => {
      it('SHOULD call navigateToIndexDetailsPage for each navigation', async () => {
        const props = getBaseProps();
        const historyPush = jest.fn();
        const ctx = getIndexManagementCtx({
          history: { push: historyPush } as unknown as AppDependencies['history'],
        });
        render(
          <I18nProvider>
            <AppContextProvider value={ctx}>
              <IndexActionsContextMenu {...props} />
            </AppContextProvider>
          </I18nProvider>
        );

        await openContextMenu();
        const overviewBtn = await screen.findByText(/show index overview/i);
        await user.click(overviewBtn);

        await openContextMenu();
        const settingsBtn = await screen.findByText(/show index settings/i);
        await user.click(settingsBtn);

        await openContextMenu();
        const mappingBtn = await screen.findByText(/show index mapping/i);
        await user.click(mappingBtn);

        expect(navigateToIndexDetailsPage).toHaveBeenCalledTimes(3);
      });
    });

    describe('AND WHEN clicking Stats', () => {
      it('SHOULD use history.push with getIndexDetailsLink', async () => {
        const props = getBaseProps();
        const historyPush = jest.fn();
        const ctx = getIndexManagementCtx({
          history: { push: historyPush } as unknown as AppDependencies['history'],
        });
        render(
          <I18nProvider>
            <AppContextProvider value={ctx}>
              <IndexActionsContextMenu {...props} />
            </AppContextProvider>
          </I18nProvider>
        );

        await openContextMenu();
        const menu = await screen.findByTestId('indexContextMenu');
        const statsBtn = await within(menu).findByText(/show index stats/i);

        await user.click(statsBtn);

        expect(getIndexDetailsLink).toHaveBeenCalled();
        expect(historyPush).toHaveBeenCalledWith('/indices/some/stats');
      });
    });
  });

  describe('WHEN enableIndexActions flag is disabled', () => {
    it('SHOULD hide common index actions', async () => {
      const props = getBaseProps();
      renderWithProviders(<IndexActionsContextMenu {...props} />, {
        config: {
          ...getIndexManagementCtx().config,
          enableIndexActions: false,
        } as AppDependencies['config'],
      });

      await openContextMenu();
      const menu = await screen.findByTestId('indexContextMenu');

      expect(within(menu).queryByText(/show index stats/i)).not.toBeInTheDocument();
      expect(within(menu).queryByTestId('closeIndexMenuButton')).not.toBeInTheDocument();
      expect(within(menu).queryByText(/force merge index/i)).not.toBeInTheDocument();
      expect(within(menu).queryByText(/refresh index/i)).not.toBeInTheDocument();
      expect(within(menu).queryByText(/clear index cache/i)).not.toBeInTheDocument();
      expect(within(menu).queryByText(/flush index/i)).not.toBeInTheDocument();
    });
  });

  describe('WHEN using extension actions', () => {
    describe('AND WHEN extension provides request-based action', () => {
      it('SHOULD render extension action and call performExtensionAction', async () => {
        const props = getBaseProps();
        const performExtensionAction = jest.fn(async () => {});

        const ctx = getIndexManagementCtx({
          services: {
            ...getIndexManagementCtx().services,
            extensionsService: {
              actions: [
                () => ({
                  buttonLabel: 'Ext Request',
                  requestMethod: jest.fn(),
                  successMessage: 'ok',
                }),
              ],
              columns: [],
              banners: [],
              toggles: [],
            } as any,
          },
        });

        render(
          <I18nProvider>
            <AppContextProvider value={ctx}>
              <IndexActionsContextMenu {...props} performExtensionAction={performExtensionAction} />
            </AppContextProvider>
          </I18nProvider>
        );

        await openContextMenu();
        const extBtn = await screen.findByText(/ext request/i);

        await user.click(extBtn);

        expect(performExtensionAction).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND WHEN extension provides modal-based action', () => {
      it('SHOULD render the extension modal from ModalHost', async () => {
        const props = getBaseProps();

        const ctx = getIndexManagementCtx({
          services: {
            ...getIndexManagementCtx().services,
            extensionsService: {
              actions: [
                () => ({
                  buttonLabel: 'Ext Modal',
                  renderConfirmModal: (close: () => void) => (
                    <div data-test-subj="ext-modal">
                      <button data-test-subj="ext-close" onClick={close} />
                    </div>
                  ),
                }),
              ],
              columns: [],
              banners: [],
              toggles: [],
            } as any,
          },
        });

        render(
          <I18nProvider>
            <AppContextProvider value={ctx}>
              <IndexActionsContextMenu {...props} />
            </AppContextProvider>
          </I18nProvider>
        );

        await openContextMenu();
        const extBtn = await screen.findByText(/ext modal/i);

        await user.click(extBtn);

        expect(await screen.findByTestId('ext-modal')).toBeInTheDocument();
      });
    });
  });

  describe('WHEN using Convert to Lookup Index action', () => {
    describe('AND WHEN index is convertible', () => {
      it('SHOULD show enabled convert action', async () => {
        const props = getBaseProps();
        const convertible: MenuProps = {
          ...props,
          indices: [
            {
              name: 'index-1',
              status: 'open' as Index['status'],
              documents: 10,
              primary: 1,
              hidden: false,
              aliases: [],
              isFrozen: false,
            } satisfies Partial<Index>,
          ] as Index[],
        };

        renderWithProviders(<IndexActionsContextMenu {...convertible} />);

        await openContextMenu();
        const convertBtn = await screen.findByTestId('convertToLookupIndexButton');

        expect(convertBtn).not.toBeDisabled();
      });

      it('SHOULD open the Convert to Lookup modal', async () => {
        const props = getBaseProps();
        const convertible: MenuProps = {
          ...props,
          indices: [
            {
              name: 'index-1',
              status: 'open' as Index['status'],
              documents: 10,
              primary: 1,
              hidden: false,
              aliases: [],
              isFrozen: false,
            } satisfies Partial<Index>,
          ] as Index[],
        };

        renderWithProviders(<IndexActionsContextMenu {...convertible} />);

        await openContextMenu();
        const convertBtn = await screen.findByTestId('convertToLookupIndexButton');

        await user.click(convertBtn);

        expect(await screen.findByTestId('mockConvertToLookup')).toBeInTheDocument();
      });
    });

    describe('AND WHEN index is not convertible', () => {
      it('SHOULD show disabled convert action with tooltip', async () => {
        const props = getBaseProps();
        const notConvertibleProps: MenuProps = {
          ...props,
          indices: [
            {
              name: 'index-1',
              status: 'open' as Index['status'],
              documents: 9999999999,
              primary: 2,
              hidden: false,
              aliases: [],
              isFrozen: false,
            } satisfies Partial<Index>,
          ] as Index[],
        };

        renderWithProviders(<IndexActionsContextMenu {...notConvertibleProps} />);
        await openContextMenu();

        const convertBtn = await screen.findByTestId('convertToLookupIndexButton');
        expect(convertBtn).toBeDisabled();

        const tooltip = await screen.findByText(/less than 2 billion documents/i);
        expect(tooltip).toBeInTheDocument();
      });
    });

    describe('AND WHEN index is hidden or already a lookup index', () => {
      it('SHOULD not show convert action', async () => {
        const props = getBaseProps();
        const hiddenOrLookup: MenuProps = {
          ...props,
          indices: [
            {
              name: 'index-1',
              status: 'open' as Index['status'],
              documents: 10,
              primary: 1,
              hidden: true,
              mode: 'lookup',
              aliases: [],
              isFrozen: false,
            } satisfies Partial<Index>,
          ] as Index[],
        };

        renderWithProviders(<IndexActionsContextMenu {...hiddenOrLookup} />);
        await openContextMenu();

        expect(screen.queryByTestId('convertToLookupIndexButton')).not.toBeInTheDocument();
      });
    });
  });
});
