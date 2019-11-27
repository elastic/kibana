/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';

import { getFollowerIndexMock } from '../../fixtures/follower_index';

jest.mock('ui/new_platform');

jest.mock('ui/chrome', () => ({
  addBasePath: () => 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
  getUiSettingsClient: () => ({
    get: x => x,
    getUpdate$: () => ({ subscribe: jest.fn() }),
  }),
}));

const { setup } = pageHelpers.followerIndexList;

describe('<FollowerIndicesList />', () => {
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
    httpRequestsMockHelpers.setLoadFollowerIndicesResponse();
  });

  describe('on component mount', () => {
    let exists;

    beforeEach(async () => {
      ({ exists } = setup());
    });

    test('should show a loading indicator on component', async () => {
      expect(exists('followerIndexLoading')).toBe(true);
    });
  });

  describe('when there are no follower indices', () => {
    let exists;
    let component;

    beforeEach(async () => {
      ({ exists, component } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should display an empty prompt', async () => {
      expect(exists('emptyPrompt')).toBe(true);
    });

    test('should have a button to create a follower index', async () => {
      expect(exists('emptyPrompt.createFollowerIndexButton')).toBe(true);
    });
  });

  describe('when there are follower indices', () => {
    let find;
    let exists;
    let component;
    let table;
    let actions;
    let tableCellsValues;

    // For deterministic tests, we need to make sure that index1 comes before index2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name to make sure that index1 name comes before index2.
    const index1 = getFollowerIndexMock({ name: `a${getRandomString()}` });
    const index2 = getFollowerIndexMock({ name: `b${getRandomString()}`, status: 'paused' });

    const followerIndices = [index1, index2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadFollowerIndicesResponse({ indices: followerIndices });

      // Mount the component
      ({
        find,
        exists,
        component,
        table,
        actions,
      } = setup());

      await nextTick(); // Make sure that the Http request is fulfilled
      component.update();

      // Read the index list table
      ({ tableCellsValues } = table.getMetaData('followerIndexListTable'));
    });

    afterEach(async () => {
      // The <EuiPopover /> updates are not all synchronouse
      // We need to wait for all the updates to ran before unmounting our component
      await nextTick(100);
    });

    test('should not display the empty prompt', () => {
      expect(exists('emptyPrompt')).toBe(false);
    });

    test('should have a button to create a follower index', () => {
      expect(exists('createFollowerIndexButton')).toBe(true);
    });

    test('should list the follower indices in the table', () => {
      expect(tableCellsValues.length).toEqual(followerIndices.length);
      expect(tableCellsValues).toEqual([
        [ '', // Empty because the first column is the checkbox to select row
          index1.name,
          'Active',
          index1.remoteCluster,
          index1.leaderIndex,
          '' // Empty because the last column is for the "actions" on the resource
        ], [ '',
          index2.name,
          'Paused',
          index2.remoteCluster,
          index2.leaderIndex,
          '' ]
      ]);
    });

    describe('action menu', () => {
      test('should be visible when a follower index is selected', () => {
        expect(exists('contextMenuButton')).toBe(false);

        actions.selectFollowerIndexAt(0);

        expect(exists('contextMenuButton')).toBe(true);
      });

      test('should have a "pause", "edit" and "unfollow" action when the follower index is active', async () => {
        actions.selectFollowerIndexAt(0);
        actions.openContextMenu();

        const contextMenu = find('contextMenu');

        expect(contextMenu.length).toBe(1);
        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map(btn => btn.text());

        expect(buttonsLabel).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should have a "resume", "edit" and "unfollow" action when the follower index is active', async () => {
        actions.selectFollowerIndexAt(1); // Select the second follower that is "paused"
        actions.openContextMenu();

        const contextMenu = find('contextMenu');

        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map(btn => btn.text());
        expect(buttonsLabel).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', () => {
        expect(exists('pauseReplicationConfirmation')).toBe(false);

        actions.selectFollowerIndexAt(0);
        actions.openContextMenu();
        actions.clickContextMenuButtonAt(0); // first button is the "pause" action

        expect(exists('pauseReplicationConfirmation')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', () => {
        expect(exists('unfollowLeaderConfirmation')).toBe(false);

        actions.selectFollowerIndexAt(0);
        actions.openContextMenu();
        actions.clickContextMenuButtonAt(2); // third button is the "unfollow" action

        expect(exists('unfollowLeaderConfirmation')).toBe(true);
      });
    });

    describe('table row action menu', () => {
      test('should open a context menu when clicking on the button of each row', async () => {
        expect(component.find('.euiContextMenuPanel').length).toBe(0);

        actions.openTableRowContextMenuAt(0);

        expect(component.find('.euiContextMenuPanel').length).toBe(1);
      });

      test('should have the "pause", "edit" and "unfollow" options in the row context menu', async () => {
        actions.openTableRowContextMenuAt(0);

        const buttonLabels = component
          .find('.euiContextMenuPanel')
          .find('.euiContextMenuItem')
          .map(button => button.text());

        expect(buttonLabels).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should have the "resume", "edit" and "unfollow" options in the row context menu', async () => {
        // We open the context menu of the second row (index 1) as followerIndices[1].status is "paused"
        actions.openTableRowContextMenuAt(1);

        const buttonLabels = component
          .find('.euiContextMenuPanel')
          .find('.euiContextMenuItem')
          .map(button => button.text());

        expect(buttonLabels).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', async () => {
        expect(exists('pauseReplicationConfirmation')).toBe(false);

        actions.openTableRowContextMenuAt(0);
        find('pauseButton').simulate('click');

        expect(exists('pauseReplicationConfirmation')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "resume"', async () => {
        expect(exists('resumeReplicationConfirmation')).toBe(false);

        actions.openTableRowContextMenuAt(1); // open the second row context menu, as it is a "paused" follower index
        find('resumeButton').simulate('click');

        expect(exists('resumeReplicationConfirmation')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', () => {
        expect(exists('unfollowLeaderConfirmation')).toBe(false);

        actions.openTableRowContextMenuAt(0);
        find('unfollowButton').simulate('click');

        expect(exists('unfollowLeaderConfirmation')).toBe(true);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on a follower index', () => {
        expect(exists('followerIndexDetail')).toBe(false);

        actions.clickFollowerIndexAt(0);

        expect(exists('followerIndexDetail')).toBe(true);
      });

      test('should set the title the index that has been selected', () => {
        actions.clickFollowerIndexAt(0); // Open the detail panel
        expect(find('followerIndexDetail.title').text()).toEqual(index1.name);
      });

      test('should indicate the correct "status", "remote cluster" and "leader index"', () => {
        actions.clickFollowerIndexAt(0);
        expect(find('followerIndexDetail.status').text()).toEqual(index1.status);
        expect(find('followerIndexDetail.remoteCluster').text()).toEqual(index1.remoteCluster);
        expect(find('followerIndexDetail.leaderIndex').text()).toEqual(index1.leaderIndex);
      });

      test('should have a "settings" section', () => {
        actions.clickFollowerIndexAt(0);
        expect(find('followerIndexDetail.settingsSection').find('h3').text()).toEqual('Settings');
        expect(exists('followerIndexDetail.settingsValues')).toBe(true);
      });

      test('should set the correct follower index settings values', () => {
        const mapSettingsToFollowerIndexProp = {
          maxReadReqOpCount: 'maxReadRequestOperationCount',
          maxOutstandingReadReq: 'maxOutstandingReadRequests',
          maxReadReqSize: 'maxReadRequestSize',
          maxWriteReqOpCount: 'maxWriteRequestOperationCount',
          maxWriteReqSize: 'maxWriteRequestSize',
          maxOutstandingWriteReq: 'maxOutstandingWriteRequests',
          maxWriteBufferCount: 'maxWriteBufferCount',
          maxWriteBufferSize: 'maxWriteBufferSize',
          maxRetryDelay: 'maxRetryDelay',
          readPollTimeout: 'readPollTimeout'
        };

        actions.clickFollowerIndexAt(0);

        Object.entries(mapSettingsToFollowerIndexProp).forEach(([setting, prop]) => {
          const wrapper = find(`settingsValues.${setting}`);

          if (!wrapper.length) {
            throw new Error(`Could not find description for setting "${setting}"`);
          }

          expect(wrapper.text()).toEqual(index1[prop].toString());
        });
      });

      test('should not have settings values for a "paused" follower index', () => {
        actions.clickFollowerIndexAt(1); // the second follower index is paused
        expect(exists('followerIndexDetail.settingsValues')).toBe(false);
        expect(find('followerIndexDetail.settingsSection').text()).toContain('paused follower index does not have settings');
      });

      test('should have a section to render the follower index shards stats', () => {
        actions.clickFollowerIndexAt(0);
        expect(exists('followerIndexDetail.shardsStatsSection')).toBe(true);
      });

      test('should render a EuiCodeEditor for each shards stats', () => {
        actions.clickFollowerIndexAt(0);

        const codeEditors = component.find(`EuiCodeEditor`);

        expect(codeEditors.length).toBe(index1.shards.length);
        codeEditors.forEach((codeEditor, i) => {
          expect(JSON.parse(codeEditor.props().value)).toEqual(index1.shards[i]);
        });
      });
    });
  });
});
