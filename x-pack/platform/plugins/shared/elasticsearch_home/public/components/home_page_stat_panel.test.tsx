/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { useIsWithinMinBreakpoint } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { NEW_INDEX_DISMISSED_KEY_SUFFIX } from '../hooks/use_new_index_dismissal';
import type { NewIndexDetails } from '../../common/types';
import { TEST_STORAGE_KEY_PREFIX, renderWithHomeContext } from '../test_utils';
import {
  HomePageStatPanel,
  type HomePageStatPanelAction,
  type HomePageStatPanelMetric,
} from './home_page_stat_panel';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useIsWithinMinBreakpoint: jest.fn(),
}));

const mockIsWithinMinBreakpoint = useIsWithinMinBreakpoint as jest.Mock;

const NEW_INDEX_DISMISSED_KEY = `${TEST_STORAGE_KEY_PREFIX}.${NEW_INDEX_DISMISSED_KEY_SUFFIX}`;

const indexManagementLocator = sharePluginMock.createLocator();
const discoverLocator = sharePluginMock.createLocator();
const { navigate: navigateToIndexDetails } = indexManagementLocator;
const { navigate: navigateToDiscover } = discoverLocator;

const share = sharePluginMock.createStartContract();
jest.spyOn(share.url.locators, 'get').mockImplementation((id) => {
  if (id === INDEX_MANAGEMENT_LOCATOR_ID) {
    return indexManagementLocator;
  }
  return id === DISCOVER_APP_LOCATOR ? discoverLocator : undefined;
});

const newIndex: NewIndexDetails = {
  indexName: 'my_vectors',
  documentsCount: 12,
  sizeInBytes: 1024,
  createdAt: Date.now(),
};

const metric = (overrides: Partial<HomePageStatPanelMetric> = {}): HomePageStatPanelMetric => ({
  key: 'total',
  label: 'Total',
  value: '12',
  isLoading: false,
  ...overrides,
});

const action = (overrides: Partial<HomePageStatPanelAction> = {}): HomePageStatPanelAction => ({
  key: 'create',
  iconType: 'plusCircle',
  label: 'Create a dashboard',
  onClick: jest.fn(),
  testSubj: 'createDashboardAction',
  telemetryId: 'createDashboardTelemetryId',
  ...overrides,
});

const renderPanel = (props: Partial<React.ComponentProps<typeof HomePageStatPanel>> = {}) =>
  renderWithHomeContext(
    <HomePageStatPanel
      iconType="productDashboard"
      title="Dashboards"
      testSubj="dashboardsCard"
      metrics={[metric()]}
      actions={[action()]}
      {...props}
    />,
    { services: { share } }
  );

// EuiPopover positions itself asynchronously once opened, so let that settle before asserting.
const openActionsMenu = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId('dashboardsCardActionsButton'));
  });
};

const openNewIndexMenu = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId('homePageDataCardNewIndexActionsButton'));
  });
};

describe('HomePageStatPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockIsWithinMinBreakpoint.mockReturnValue(true);
  });

  describe('metrics', () => {
    it('shows a loading placeholder instead of the value while a metric is loading', () => {
      renderPanel({
        metrics: [
          metric({ key: 'total', label: 'Total', value: '12', isLoading: true }),
          metric({ key: 'starred', label: 'Starred', value: '3', isLoading: false }),
        ],
      });

      // the label stays visible so the panel does not reflow once the value lands
      expect(screen.getByTestId('dashboardsCard-total-label')).toHaveTextContent('Total');
      expect(screen.getByTestId('dashboardsCard-total-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboardsCard-total-value')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboardsCard-starred-value')).toHaveTextContent('3');
    });
  });

  describe('actions', () => {
    it('puts every action behind the overflow menu by default', async () => {
      const onCreate = jest.fn();
      renderPanel({ actions: [action({ onClick: onCreate })] });

      expect(screen.queryByTestId('createDashboardAction')).not.toBeInTheDocument();

      await openActionsMenu();
      fireEvent.click(screen.getByTestId('createDashboardAction'));

      expect(onCreate).toHaveBeenCalled();
    });

    it('promotes the first action to a button when showPrimary is set', async () => {
      const onCreate = jest.fn();
      const onManage = jest.fn();
      renderPanel({
        showPrimary: true,
        actions: [
          action({ key: 'create', label: 'Create a dashboard', onClick: onCreate }),
          action({
            key: 'manage',
            label: 'Manage dashboards',
            onClick: onManage,
            testSubj: 'manageDashboardsAction',
          }),
        ],
      });

      fireEvent.click(screen.getByTestId('createDashboardAction'));
      expect(onCreate).toHaveBeenCalled();

      // the promoted action is not repeated inside the overflow menu
      await openActionsMenu();
      expect(screen.getAllByTestId('createDashboardAction')).toHaveLength(1);
      expect(screen.getByTestId('manageDashboardsAction')).toBeInTheDocument();
    });

    it('omits the overflow menu when the only action has been promoted', () => {
      renderPanel({ showPrimary: true, actions: [action()] });

      expect(screen.getByTestId('createDashboardAction')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboardsCardActionsButton')).not.toBeInTheDocument();
    });

    it('renders no action controls when there are no actions', () => {
      renderPanel({ actions: [] });

      expect(screen.queryByTestId('dashboardsCardActionsButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('createDashboardAction')).not.toBeInTheDocument();
    });

    it('closes the overflow menu after an item is selected', async () => {
      renderPanel({
        actions: [
          action({ key: 'create', label: 'Create a dashboard' }),
          action({ key: 'manage', label: 'Manage dashboards', testSubj: 'manageDashboardsAction' }),
        ],
      });

      await openActionsMenu();
      const item = screen.getByTestId('manageDashboardsAction');
      fireEvent.click(item);

      await waitForElementToBeRemoved(item);
    });
  });

  describe('the new index footer', () => {
    it('appears when there is a new index', () => {
      renderPanel({ newIndex });

      expect(screen.getByTestId('homePageDataCardNewIndex')).toBeInTheDocument();
    });

    it('is left out when there is no new index', () => {
      renderPanel({ newIndex: null });

      expect(screen.queryByTestId('homePageDataCardNewIndex')).not.toBeInTheDocument();
    });

    it('stays hidden once that index has been dismissed', () => {
      window.localStorage.setItem(
        NEW_INDEX_DISMISSED_KEY,
        JSON.stringify({ indexName: newIndex.indexName, createdAt: newIndex.createdAt })
      );

      renderPanel({ newIndex });

      expect(screen.queryByTestId('homePageDataCardNewIndex')).not.toBeInTheDocument();
    });

    it('comes back for an index created after the dismissed one', () => {
      window.localStorage.setItem(
        NEW_INDEX_DISMISSED_KEY,
        JSON.stringify({ indexName: 'older_vectors', createdAt: newIndex.createdAt - 1000 })
      );

      renderPanel({ newIndex });

      expect(screen.getByTestId('homePageDataCardNewIndex')).toBeInTheDocument();
    });

    it('comes back for an index recreated under the same name', () => {
      window.localStorage.setItem(
        NEW_INDEX_DISMISSED_KEY,
        JSON.stringify({ indexName: newIndex.indexName, createdAt: newIndex.createdAt - 1000 })
      );

      renderPanel({ newIndex });

      expect(screen.getByTestId('homePageDataCardNewIndex')).toBeInTheDocument();
    });

    it('opens the index in index management', () => {
      renderPanel({ newIndex });

      fireEvent.click(screen.getByTestId('homePageDataCardNewIndexOpenBtn'));

      expect(navigateToIndexDetails).toHaveBeenCalledWith({
        page: 'index_details',
        indexName: newIndex.indexName,
      });
    });

    it('opens the index in Discover as an ad hoc data view', async () => {
      renderPanel({ newIndex });

      await openNewIndexMenu();
      fireEvent.click(screen.getByTestId('homePageDataCardNewIndexDiscoverMenuItem'));

      expect(navigateToDiscover).toHaveBeenCalledWith({
        dataViewSpec: { title: newIndex.indexName },
      });
    });

    it('moves the inline actions into the overflow menu on a narrow screen', async () => {
      mockIsWithinMinBreakpoint.mockReturnValue(false);
      renderPanel({ newIndex });

      expect(screen.queryByTestId('homePageDataCardNewIndexOpenBtn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('homePageDataCardNewIndexDismissBtn')).not.toBeInTheDocument();

      await openNewIndexMenu();

      expect(screen.getByTestId('homePageDataCardNewIndexOpenMenuItem')).toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCardNewIndexDismissMenuItem')).toBeInTheDocument();
    });

    it('disappears when dismissed, recording which index that was', () => {
      renderPanel({ newIndex });

      fireEvent.click(screen.getByTestId('homePageDataCardNewIndexDismissBtn'));

      expect(screen.queryByTestId('homePageDataCardNewIndex')).not.toBeInTheDocument();
      expect(window.localStorage.getItem(NEW_INDEX_DISMISSED_KEY)).toBe(
        JSON.stringify({ indexName: newIndex.indexName, createdAt: newIndex.createdAt })
      );
    });
  });
});
