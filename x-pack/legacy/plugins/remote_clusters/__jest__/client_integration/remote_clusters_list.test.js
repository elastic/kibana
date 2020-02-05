/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  pageHelpers,
  setupEnvironment,
  nextTick,
  getRandomString,
  findTestSubject,
} from './helpers';

import { getRouter } from '../../public/app/services';
import { getRemoteClusterMock } from '../../fixtures/remote_cluster';

jest.mock('ui/new_platform');

const { setup } = pageHelpers.remoteClustersList;

describe('<RemoteClusterList />', () => {
  let server;
  let httpRequestsMockHelpers;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setLoadRemoteClustersResponse();
  });

  describe('on component mount', () => {
    let exists;

    beforeEach(async () => {
      ({ exists } = setup());
    });

    test('should show a "loading remote clusters" indicator', async () => {
      expect(exists('remoteClustersTableLoading')).toBe(true);
    });
  });

  describe('when there are no remote clusters', () => {
    let exists;
    let component;

    beforeEach(async () => {
      ({ exists, component } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to kick in
      component.update();
    });

    test('should display an empty prompt', async () => {
      expect(exists('remoteClusterListEmptyPrompt')).toBe(true);
    });

    test('should have a button to create a remote cluster', async () => {
      expect(exists('remoteClusterEmptyPromptCreateButton')).toBe(true);
    });
  });

  describe('when there are remote clusters', () => {
    let find;
    let exists;
    let component;
    let table;
    let actions;
    let tableCellsValues;
    let rows;

    // For deterministic tests, we need to make sure that remoteCluster1 comes before remoteCluster2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name to make sure that remoteCluster1 name comes before remoteCluster2.
    const remoteCluster1 = getRemoteClusterMock({ name: `a${getRandomString()}` });
    const remoteCluster2 = getRemoteClusterMock({
      name: `b${getRandomString()}`,
      isConnected: false,
      connectedNodesCount: 0,
      seeds: ['localhost:9500'],
      isConfiguredByNode: true,
    });

    const remoteClusters = [remoteCluster1, remoteCluster2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);

      // Mount the component
      ({ component, find, exists, table, actions } = setup());

      await nextTick(); // Make sure that the Http request is fulfilled
      component.update();

      // Read the remote clusters list table
      ({ rows, tableCellsValues } = table.getMetaData('remoteClusterListTable'));
    });

    test('should not display the empty prompt', () => {
      expect(exists('remoteClusterListEmptyPrompt')).toBe(false);
    });

    test('should have a button to create a remote cluster', () => {
      expect(exists('remoteClusterCreateButton')).toBe(true);
    });

    test('should list the remote clusters in the table', () => {
      expect(tableCellsValues.length).toEqual(remoteClusters.length);
      expect(tableCellsValues).toEqual([
        [
          '', // Empty because the first column is the checkbox to select the row
          remoteCluster1.name,
          remoteCluster1.seeds.join(', '),
          'Connected',
          remoteCluster1.connectedNodesCount.toString(),
          '', // Empty because the last column is for the "actions" on the resource
        ],
        [
          '',
          remoteCluster2.name,
          remoteCluster2.seeds.join(', '),
          'Not connected',
          remoteCluster2.connectedNodesCount.toString(),
          '',
        ],
      ]);
    });

    test('should have a tooltip to indicate that the cluster has been defined in elasticsearch.yml', () => {
      const secondRow = rows[1].reactWrapper; // The second cluster has been defined by node
      expect(
        findTestSubject(secondRow, 'remoteClustersTableListClusterDefinedByNodeTooltip').length
      ).toBe(1);
    });

    describe('bulk delete button', () => {
      test('should be visible when a remote cluster is selected', () => {
        expect(exists('remoteClusterBulkDeleteButton')).toBe(false);

        actions.selectRemoteClusterAt(0);

        expect(exists('remoteClusterBulkDeleteButton')).toBe(true);
      });

      test('should update the button label if more than 1 remote cluster is selected', () => {
        actions.selectRemoteClusterAt(0);

        const button = find('remoteClusterBulkDeleteButton');
        expect(button.text()).toEqual('Remove remote cluster');

        actions.selectRemoteClusterAt(1);
        expect(button.text()).toEqual('Remove 2 remote clusters');
      });

      test('should open a confirmation modal when clicking on it', () => {
        expect(exists('remoteClustersDeleteConfirmModal')).toBe(false);

        actions.selectRemoteClusterAt(0);
        actions.clickBulkDeleteButton();

        expect(exists('remoteClustersDeleteConfirmModal')).toBe(true);
      });
    });

    describe('table row actions', () => {
      test('should have a "delete" and an "edit" action button on each row', () => {
        const indexLastColumn = rows[0].columns.length - 1;
        const tableCellActions = rows[0].columns[indexLastColumn].reactWrapper;

        const deleteButton = findTestSubject(tableCellActions, 'remoteClusterTableRowRemoveButton');
        const editButton = findTestSubject(tableCellActions, 'remoteClusterTableRowEditButton');

        expect(deleteButton.length).toBe(1);
        expect(editButton.length).toBe(1);
      });

      test('should open a confirmation modal when clicking on "delete" button', async () => {
        expect(exists('remoteClustersDeleteConfirmModal')).toBe(false);

        actions.clickRowActionButtonAt(0, 'delete');

        expect(exists('remoteClustersDeleteConfirmModal')).toBe(true);
      });
    });

    describe('confirmation modal (delete remote cluster)', () => {
      test('should remove the remote cluster from the table after delete is successful', async () => {
        // Mock HTTP DELETE request
        httpRequestsMockHelpers.setDeleteRemoteClusterResponse({
          itemsDeleted: [remoteCluster1.name],
          errors: [],
        });

        // Make sure that we have our 2 remote clusters in the table
        expect(rows.length).toBe(2);

        actions.selectRemoteClusterAt(0);
        actions.clickBulkDeleteButton();
        actions.clickConfirmModalDeleteRemoteCluster();

        await nextTick(550); // there is a 500ms timeout in the api action
        component.update();

        ({ rows } = table.getMetaData('remoteClusterListTable'));

        expect(rows.length).toBe(1);
        expect(rows[0].columns[1].value).toEqual(remoteCluster2.name);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on a remote cluster', () => {
        expect(exists('remoteClusterDetailFlyout')).toBe(false);

        actions.clickRemoteClusterAt(0);

        expect(exists('remoteClusterDetailFlyout')).toBe(true);
      });

      test('should set the title to the remote cluster selected', () => {
        actions.clickRemoteClusterAt(0); // Select remote cluster and open the detail panel
        expect(find('remoteClusterDetailsFlyoutTitle').text()).toEqual(remoteCluster1.name);
      });

      test('should have a "Status" section', () => {
        actions.clickRemoteClusterAt(0);
        expect(
          find('remoteClusterDetailPanelStatusSection')
            .find('h3')
            .text()
        ).toEqual('Status');
        expect(exists('remoteClusterDetailPanelStatusValues')).toBe(true);
      });

      test('should set the correct remote cluster status values', () => {
        actions.clickRemoteClusterAt(0);

        expect(find('remoteClusterDetailIsConnected').text()).toEqual('Connected');
        expect(find('remoteClusterDetailConnectedNodesCount').text()).toEqual(
          remoteCluster1.connectedNodesCount.toString()
        );
        expect(find('remoteClusterDetailSeeds').text()).toEqual(remoteCluster1.seeds.join(' '));
        expect(find('remoteClusterDetailSkipUnavailable').text()).toEqual('No');
        expect(find('remoteClusterDetailMaxConnections').text()).toEqual(
          remoteCluster1.maxConnectionsPerCluster.toString()
        );
        expect(find('remoteClusterDetailInitialConnectTimeout').text()).toEqual(
          remoteCluster1.initialConnectTimeout
        );
      });

      test('should have a "close", "delete" and "edit" button in the footer', () => {
        actions.clickRemoteClusterAt(0);
        expect(exists('remoteClusterDetailsPanelCloseButton')).toBe(true);
        expect(exists('remoteClusterDetailPanelRemoveButton')).toBe(true);
        expect(exists('remoteClusterDetailPanelEditButton')).toBe(true);
      });

      test('should close the detail panel when clicking the "close" button', () => {
        actions.clickRemoteClusterAt(0); // open the detail panel
        expect(exists('remoteClusterDetailFlyout')).toBe(true);

        find('remoteClusterDetailsPanelCloseButton').simulate('click');

        expect(exists('remoteClusterDetailFlyout')).toBe(false);
      });

      test('should open a confirmation modal when clicking the "delete" button', () => {
        actions.clickRemoteClusterAt(0);
        expect(exists('remoteClustersDeleteConfirmModal')).toBe(false);

        find('remoteClusterDetailPanelRemoveButton').simulate('click');

        expect(exists('remoteClustersDeleteConfirmModal')).toBe(true);
      });

      test('should display a "Remote cluster not found" when providing a wrong cluster name', async () => {
        expect(exists('remoteClusterDetailFlyout')).toBe(false);

        getRouter().history.replace({ search: `?cluster=wrong-cluster` });
        component.update();

        expect(exists('remoteClusterDetailFlyout')).toBe(true);
        expect(exists('remoteClusterDetailClusterNotFound')).toBe(true);
      });

      test('should display a warning when the cluster is configured by node', () => {
        actions.clickRemoteClusterAt(0); // the remoteCluster1 has *not* been configured by node
        expect(exists('remoteClusterConfiguredByNodeWarning')).toBe(false);

        actions.clickRemoteClusterAt(1); // the remoteCluster2 has been configured by node
        expect(exists('remoteClusterConfiguredByNodeWarning')).toBe(true);
      });
    });
  });
});
