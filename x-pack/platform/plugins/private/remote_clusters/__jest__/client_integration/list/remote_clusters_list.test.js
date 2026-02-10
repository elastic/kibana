/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';

import { getRouter } from '../../../public/application/services';
import { getRemoteClusterMock } from '../../../fixtures/remote_cluster';

import { PROXY_MODE } from '../../../common/constants';

import { EuiPaginationTestHarness, EuiTableTestHarness } from '@kbn/test-eui-helpers';
import { getRandomString } from '@kbn/test-jest-helpers';

import { RemoteClusterList } from '../../../public/application/sections/remote_cluster_list';
import { setupEnvironment } from '../helpers/setup_environment';
import { renderRemoteClustersRoute } from '../helpers/render';

jest.mock('@elastic/eui/lib/components/search_bar/search_box', () => {
  return {
    EuiSearchBox: (props) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockSearchBox'}
        onChange={(event) => {
          props.onSearch(event.target.value);
        }}
      />
    ),
  };
});

describe('<RemoteClusterList />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  httpRequestsMockHelpers.setLoadRemoteClustersResponse([]);

  const renderList = (overrides) =>
    renderRemoteClustersRoute(RemoteClusterList, {
      httpSetup,
      contextOverrides: overrides,
      routePath: '/list',
      initialEntries: ['/list'],
    });

  describe('on component mount', () => {
    test('should show a "loading remote clusters" indicator', async () => {
      renderList();
      expect(screen.getByTestId('remoteClustersTableLoading')).toBeInTheDocument();
      // Wait for the initial async load to settle to avoid act warnings.
      expect(await screen.findByTestId('remoteClusterListEmptyPrompt')).toBeInTheDocument();
    });
  });

  describe('when there are no remote clusters', () => {
    test('should display an empty prompt', async () => {
      renderList();
      expect(await screen.findByTestId('remoteClusterListEmptyPrompt')).toBeInTheDocument();
    });

    test('should have a button to create a remote cluster', async () => {
      renderList();
      expect(await screen.findByTestId('remoteClusterEmptyPromptCreateButton')).toBeInTheDocument();
    });
  });

  describe('can search', () => {
    const remoteClusters = [
      {
        name: 'simple_remote_cluster',
        seeds: ['127.0.0.1:2000', '127.0.0.2:3000'],
      },
      {
        name: 'remote_cluster_with_proxy',
        proxyAddress: '192.168.0.1:80',
        mode: PROXY_MODE,
      },
    ];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
    });

    test('without any search params it should show all clusters', async () => {
      renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');
      expect(table.getCellValues().length).toBe(2);
    });

    test('search by seed works', async () => {
      const { user } = renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');

      await user.type(screen.getByTestId('remoteClusterSearch'), 'simple');

      await waitFor(() => {
        expect(table.getCellValues().length).toBe(1);
      });
    });

    test('search by proxyAddress works', async () => {
      const { user } = renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');

      await user.type(screen.getByTestId('remoteClusterSearch'), 'proxy');

      await waitFor(() => {
        expect(table.getCellValues().length).toBe(1);
      });
    });
  });

  describe('when there are multiple pages of remote clusters', () => {
    const remoteClusters = [
      {
        name: 'unique',
        seeds: [],
      },
    ];

    for (let i = 0; i < 29; i++) {
      if (i % 2 === 0) {
        remoteClusters.push({
          name: `cluster-${i}`,
          seeds: [],
        });
      } else {
        remoteClusters.push({
          name: `cluster_with_proxy-${i}`,
          proxyAddress: `127.0.0.1:10${i}`,
          mode: PROXY_MODE,
        });
      }
    }

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
    });

    test('pagination works', async () => {
      renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');
      const pagination = new EuiPaginationTestHarness();

      pagination.click('next');

      // Pagination defaults to 20 remote clusters per page. We loaded 30 remote clusters,
      // so the second page should have 10.
      await waitFor(() => {
        expect(table.getCellValues().length).toBe(10);
      });
    });

    test('search works', async () => {
      const { user } = renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');

      await user.type(screen.getByTestId('remoteClusterSearch'), 'unique');

      await waitFor(() => {
        expect(table.getCellValues().length).toBe(1);
      });
    });
  });

  describe('when there are remote clusters', () => {
    // For deterministic tests, we need to make sure that remoteCluster1 comes before remoteCluster2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name to make sure that remoteCluster1 name comes before remoteCluster2.
    const remoteCluster1 = getRemoteClusterMock({ name: `a${getRandomString()}` });
    const remoteCluster2 = getRemoteClusterMock({
      name: `b${getRandomString()}`,
      isConnected: false,
      connectedSocketsCount: 0,
      proxyAddress: 'localhost:9500',
      isConfiguredByNode: true,
      mode: PROXY_MODE,
      seeds: null,
      connectedNodesCount: null,
    });
    const remoteCluster3 = getRemoteClusterMock({
      name: `c${getRandomString()}`,
      isConnected: false,
      connectedSocketsCount: 0,
      proxyAddress: 'localhost:9500',
      isConfiguredByNode: false,
      mode: PROXY_MODE,
      hasDeprecatedProxySetting: true,
      seeds: null,
      connectedNodesCount: null,
      securityModel: 'api_keys',
    });

    const remoteClusters = [remoteCluster1, remoteCluster2, remoteCluster3];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
    });

    test('should not display the empty prompt', async () => {
      renderList();
      await screen.findByTestId('remoteClusterListTable');
      expect(screen.queryByTestId('remoteClusterListEmptyPrompt')).not.toBeInTheDocument();
    });

    test('should have a button to create a remote cluster', async () => {
      renderList();
      expect(await screen.findByTestId('remoteClusterCreateButton')).toBeInTheDocument();
    });

    test('should have link to documentation', async () => {
      renderList();
      expect(await screen.findByTestId('documentationLink')).toBeInTheDocument();
    });

    test('should list the remote clusters in the table', async () => {
      renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');

      const tableCellsValues = table.getCellValues();
      expect(tableCellsValues.length).toEqual(remoteClusters.length);
      expect(tableCellsValues).toEqual([
        [
          '', // Empty because the first column is the checkbox to select the row
          remoteCluster1.name,
          'Connected',
          'default',
          remoteCluster1.seeds.join(', '),
          'CertificateInfo',
          remoteCluster1.connectedNodesCount.toString(),
          '', // Empty because the last column is for the "actions" on the resource
        ],
        [
          '',
          remoteCluster2.name.concat('Info'), //Tests include the word "info" to account for the rendered text coming from EuiIcon
          'Not connected',
          PROXY_MODE,
          remoteCluster2.proxyAddress,
          'CertificateInfo',
          remoteCluster2.connectedSocketsCount.toString(),
          '',
        ],
        [
          '',
          remoteCluster3.name.concat('Info'), //Tests include the word "info" to account for the rendered text coming from EuiIcon
          'Not connected',
          PROXY_MODE,
          remoteCluster2.proxyAddress,
          'api_keysInfo',
          remoteCluster2.connectedSocketsCount.toString(),
          '',
        ],
      ]);
    });

    test('should have a tooltip to indicate that the cluster has been defined in elasticsearch.yml', async () => {
      renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');
      const secondRow = table.getRowByCellText(remoteCluster2.name);
      expect(
        within(secondRow).getByTestId('remoteClustersTableListClusterDefinedByNodeTooltip')
      ).toBeInTheDocument();
    });

    test('should have a tooltip to indicate that the cluster has a deprecated setting', async () => {
      renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');
      const thirdRow = table.getRowByCellText(remoteCluster3.name);
      expect(
        within(thirdRow).getByTestId('remoteClustersTableListClusterWithDeprecatedSettingTooltip')
      ).toBeInTheDocument();
    });

    test('should have a tooltip to indicate that the cluster is using an old security model', async () => {
      renderList();
      await screen.findByTestId('remoteClusterListTable');
      const table = new EuiTableTestHarness('remoteClusterListTable');
      const secondRow = table.getRowByCellText(remoteCluster2.name);
      expect(within(secondRow).getByTestId('authenticationTypeWarning')).toBeInTheDocument();
    });

    describe('bulk delete button', () => {
      test('should be visible when a remote cluster is selected', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        expect(screen.queryByTestId('remoteClusterBulkDeleteButton')).not.toBeInTheDocument();

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByRole('checkbox'));

        expect(screen.getByTestId('remoteClusterBulkDeleteButton')).toBeInTheDocument();
      });

      test('should update the button label if more than 1 remote cluster is selected', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByRole('checkbox'));

        expect(screen.getByTestId('remoteClusterBulkDeleteButton')).toHaveTextContent(
          'Remove remote cluster'
        );

        // The second cluster is not selectable (defined by node). Select the third one instead.
        const thirdRow = table.getRowByCellText(remoteCluster3.name);
        await user.click(within(thirdRow).getByRole('checkbox'));

        expect(screen.getByTestId('remoteClusterBulkDeleteButton')).toHaveTextContent(
          'Remove 2 remote clusters'
        );
      });

      test('should open a confirmation modal when clicking on it', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        expect(screen.queryByTestId('remoteClustersDeleteConfirmModal')).not.toBeInTheDocument();

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByRole('checkbox'));
        await user.click(screen.getByTestId('remoteClusterBulkDeleteButton'));

        expect(screen.getByTestId('remoteClustersDeleteConfirmModal')).toBeInTheDocument();
      });
    });

    describe('table row actions', () => {
      test('should have a "delete" and an "edit" action button on each row', async () => {
        renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');
        const firstRow = table.getRowByCellText(remoteCluster1.name);

        expect(
          within(firstRow).getByTestId('remoteClusterTableRowRemoveButton')
        ).toBeInTheDocument();
        expect(within(firstRow).getByTestId('remoteClusterTableRowEditButton')).toBeInTheDocument();
      });

      test('should open a confirmation modal when clicking on "delete" button', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        expect(screen.queryByTestId('remoteClustersDeleteConfirmModal')).not.toBeInTheDocument();

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClusterTableRowRemoveButton'));

        expect(screen.getByTestId('remoteClustersDeleteConfirmModal')).toBeInTheDocument();
      });
    });

    describe('confirmation modal (delete remote cluster)', () => {
      test('should remove the remote cluster from the table after delete is successful', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');

        // Mock HTTP DELETE request
        httpRequestsMockHelpers.setDeleteRemoteClusterResponse(remoteCluster1.name, {
          itemsDeleted: [remoteCluster1.name],
          errors: [],
        });

        const table = new EuiTableTestHarness('remoteClusterListTable');

        // Make sure that we have our 3 remote clusters in the table
        expect(table.getCellValues().length).toBe(3);

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByRole('checkbox'));
        await user.click(screen.getByTestId('remoteClusterBulkDeleteButton'));

        const modal = screen.getByTestId('remoteClustersDeleteConfirmModal');
        await user.click(within(modal).getByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(table.getCellValues().length).toBe(2);
        });

        expect(screen.getByText(remoteCluster2.name)).toBeInTheDocument();
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on a remote cluster', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        expect(screen.queryByTestId('remoteClusterDetailFlyout')).not.toBeInTheDocument();

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));

        expect(await screen.findByTestId('remoteClusterDetailFlyout')).toBeInTheDocument();
      });

      test('should set the title to the remote cluster selected', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));

        expect(await screen.findByTestId('remoteClusterDetailsFlyoutTitle')).toHaveTextContent(
          remoteCluster1.name
        );
      });

      test('should have a "Status" section', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));

        const section = await screen.findByTestId('remoteClusterDetailPanelStatusSection');
        expect(within(section).getByRole('heading', { level: 3 })).toHaveTextContent('Status');
        expect(screen.getByTestId('remoteClusterDetailPanelStatusValues')).toBeInTheDocument();
      });

      test('should set the correct remote cluster status values', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));

        expect(await screen.findByTestId('remoteClusterDetailIsConnected')).toHaveTextContent(
          'Connected'
        );
        expect(screen.getByTestId('remoteClusterDetailConnectedNodesCount')).toHaveTextContent(
          remoteCluster1.connectedNodesCount.toString()
        );
        expect(screen.getByTestId('remoteClusterDetailSeeds')).toHaveTextContent(
          remoteCluster1.seeds.join(' ')
        );
        expect(screen.getByTestId('remoteClusterDetailSkipUnavailable')).toHaveTextContent('No');
        expect(screen.getByTestId('remoteClusterDetailMaxConnections')).toHaveTextContent(
          remoteCluster1.maxConnectionsPerCluster.toString()
        );
        expect(screen.getByTestId('remoteClusterDetailInitialConnectTimeout')).toHaveTextContent(
          remoteCluster1.initialConnectTimeout
        );
      });

      test('should have a "close", "delete" and "edit" button in the footer', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));

        expect(
          await screen.findByTestId('remoteClusterDetailsPanelCloseButton')
        ).toBeInTheDocument();
        expect(screen.getByTestId('remoteClusterDetailPanelRemoveButton')).toBeInTheDocument();
        expect(screen.getByTestId('remoteClusterDetailPanelEditButton')).toBeInTheDocument();
      });

      test('should close the detail panel when clicking the "close" button', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));

        expect(await screen.findByTestId('remoteClusterDetailFlyout')).toBeInTheDocument();

        await user.click(screen.getByTestId('remoteClusterDetailsPanelCloseButton'));

        await waitFor(() => {
          expect(screen.queryByTestId('remoteClusterDetailFlyout')).not.toBeInTheDocument();
        });
      });

      test('should open a confirmation modal when clicking the "delete" button', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));

        expect(screen.queryByTestId('remoteClustersDeleteConfirmModal')).not.toBeInTheDocument();

        await user.click(screen.getByTestId('remoteClusterDetailPanelRemoveButton'));

        expect(screen.getByTestId('remoteClustersDeleteConfirmModal')).toBeInTheDocument();
      });

      test('should display a "Remote cluster not found" when providing a wrong cluster name', async () => {
        renderList();
        expect(screen.queryByTestId('remoteClusterDetailFlyout')).not.toBeInTheDocument();

        act(() => {
          getRouter().history.replace({ search: `?cluster=wrong-cluster` });
        });

        expect(await screen.findByTestId('remoteClusterDetailFlyout')).toBeInTheDocument();
        expect(screen.getByTestId('remoteClusterDetailClusterNotFound')).toBeInTheDocument();
      });

      test('should display a warning when the cluster is configured by node', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const firstRow = table.getRowByCellText(remoteCluster1.name);
        await user.click(within(firstRow).getByTestId('remoteClustersTableListClusterLink'));
        expect(
          screen.queryByTestId('remoteClusterConfiguredByNodeWarning')
        ).not.toBeInTheDocument();

        await user.click(screen.getByTestId('remoteClusterDetailsPanelCloseButton'));
        await waitFor(() => {
          expect(screen.queryByTestId('remoteClusterDetailFlyout')).not.toBeInTheDocument();
        });

        const secondRow = table.getRowByCellText(remoteCluster2.name);
        await user.click(within(secondRow).getByTestId('remoteClustersTableListClusterLink'));
        expect(
          await screen.findByTestId('remoteClusterConfiguredByNodeWarning')
        ).toBeInTheDocument();
      });

      test('Should display authentication type', async () => {
        const { user } = renderList();
        await screen.findByTestId('remoteClusterListTable');
        const table = new EuiTableTestHarness('remoteClusterListTable');

        const thirdRow = table.getRowByCellText(remoteCluster3.name);
        await user.click(within(thirdRow).getByTestId('remoteClustersTableListClusterLink'));
        expect(await screen.findByTestId('remoteClusterDetailAuthType')).toBeInTheDocument();
      });
    });
  });
});
