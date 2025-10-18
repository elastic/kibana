/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, act } from '@testing-library/react';
import './mocks';
import { getFollowerIndexMock } from './fixtures/follower_index';
import { setupEnvironment, pageHelpers, getRandomString } from './helpers';
import { getTableCellsValues, getTableRows } from './helpers/eui_table';
import { resetCcrStore } from './helpers/store';

const { setup } = pageHelpers.followerIndexList;

describe('<FollowerIndicesList />', () => {
  let httpRequestsMockHelpers;
  let user;

  beforeAll(() => {
    jest.useFakeTimers();
    ({ httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetCcrStore();
    httpRequestsMockHelpers.setLoadFollowerIndicesResponse();
  });

  describe('on component mount', () => {
    beforeEach(() => {
      ({ user } = setup());
    });

    test('should show a loading indicator on component', () => {
      expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
    });
  });

  describe('when there are no follower indices', () => {
    beforeEach(async () => {
      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should display an empty prompt', () => {
      expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    });

    test('should have a button to create a follower index', () => {
      expect(screen.getByTestId('createFollowerIndexButton')).toBeInTheDocument();
    });
  });

  describe('when there are multiple pages of follower indices', () => {
    const followerIndices = [{ name: 'unique', seeds: [] }];

    for (let i = 0; i < 29; i++) {
      followerIndices.push({ name: `name${i}`, seeds: [] });
    }

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadFollowerIndicesResponse({ indices: followerIndices });
      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('pagination works', async () => {
      const initialRows = getTableRows('followerIndexListTable');
      expect(initialRows.length).toBe(20); // Default page size

      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      const rowsAfterPagination = getTableRows('followerIndexListTable');
      expect(rowsAfterPagination.length).toBe(10); // Remaining items on page 2
    });

    test('search works', async () => {
      const searchBox = screen.getByTestId('followerIndexSearch');
      await user.type(searchBox, 'unique');

      const rows = getTableRows('followerIndexListTable');
      expect(rows.length).toBe(1);
    });
  });

  describe('when there are follower indices', () => {
    let tableCellsValues;

    const index1 = getFollowerIndexMock({ name: `a${getRandomString()}` });
    const index2 = getFollowerIndexMock({ name: `b${getRandomString()}`, status: 'paused' });

    const followerIndices = [index1, index2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadFollowerIndicesResponse({ indices: followerIndices });

      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      tableCellsValues = getTableCellsValues('followerIndexListTable');
    });

    test('should not display the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });

    test('should have a button to create a follower index', () => {
      expect(screen.getByTestId('createFollowerIndexButton')).toBeInTheDocument();
    });

    test('should list the follower indices in the table', () => {
      expect(tableCellsValues.length).toEqual(followerIndices.length);
      expect(tableCellsValues).toEqual([
        [
          '', // Checkbox column
          index1.name,
          'Active',
          index1.remoteCluster,
          index1.leaderIndex,
          '', // Actions column
        ],
        ['', index2.name, 'Paused', index2.remoteCluster, index2.leaderIndex, ''],
      ]);
    });

    describe('action menu', () => {
      test('should be visible when a follower index is selected', async () => {
        expect(screen.queryByTestId('contextMenuButton')).not.toBeInTheDocument();

        const rows = getTableRows('followerIndexListTable');
        const firstCheckbox = within(rows[0]).getByRole('checkbox');
        await user.click(firstCheckbox);

        expect(await screen.findByTestId('contextMenuButton')).toBeInTheDocument();
      });

      test('should have a "pause", "edit" and "unfollow" action when the follower index is active', async () => {
        const rows = getTableRows('followerIndexListTable');
        const firstCheckbox = within(rows[0]).getByRole('checkbox');
        await user.click(firstCheckbox);

        const contextMenuButton = await screen.findByTestId('contextMenuButton');
        await user.click(contextMenuButton);

        const contextMenu = await screen.findByTestId('contextMenu');
        const buttons = within(contextMenu).queryAllByRole('button');
        const buttonsLabel = buttons.map((btn) => btn.textContent);

        expect(buttonsLabel).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should have a "resume", "edit" and "unfollow" action when the follower index is paused', async () => {
        const rows = getTableRows('followerIndexListTable');
        const secondCheckbox = within(rows[1]).getByRole('checkbox');
        await user.click(secondCheckbox);

        const contextMenuButton = await screen.findByTestId('contextMenuButton');
        await user.click(contextMenuButton);

        const contextMenu = await screen.findByTestId('contextMenu');
        const buttons = within(contextMenu).queryAllByRole('button');
        const buttonsLabel = buttons.map((btn) => btn.textContent);

        expect(buttonsLabel).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', async () => {
        expect(screen.queryByTestId('pauseReplicationConfirmation')).not.toBeInTheDocument();

        const rows = getTableRows('followerIndexListTable');
        const firstCheckbox = within(rows[0]).getByRole('checkbox');
        await user.click(firstCheckbox);

        const contextMenuButton = await screen.findByTestId('contextMenuButton');
        await user.click(contextMenuButton);

        const contextMenu = await screen.findByTestId('contextMenu');
        const pauseButton = within(contextMenu).queryAllByRole('button')[0];
        await user.click(pauseButton);

        expect(await screen.findByTestId('pauseReplicationConfirmation')).toBeInTheDocument();
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', async () => {
        expect(screen.queryByTestId('unfollowLeaderConfirmation')).not.toBeInTheDocument();

        const rows = getTableRows('followerIndexListTable');
        const firstCheckbox = within(rows[0]).getByRole('checkbox');
        await user.click(firstCheckbox);

        const contextMenuButton = await screen.findByTestId('contextMenuButton');
        await user.click(contextMenuButton);

        const contextMenu = await screen.findByTestId('contextMenu');
        const unfollowButton = within(contextMenu).queryAllByRole('button')[2];
        await user.click(unfollowButton);

        expect(await screen.findByTestId('unfollowLeaderConfirmation')).toBeInTheDocument();
      });
    });

    describe('table row action menu', () => {
      test('should open a context menu when clicking on the button of each row', async () => {
        expect(document.querySelector('.euiContextMenuPanel')).toBeNull();

        const rows = getTableRows('followerIndexListTable');
        const actionButton = within(rows[0]).getByTestId('euiCollapsedItemActionsButton');
        await user.click(actionButton);

        expect(document.querySelector('.euiContextMenuPanel')).not.toBeNull();
      });

      test('should have the "pause", "edit" and "unfollow" options in the row context menu', async () => {
        const rows = getTableRows('followerIndexListTable');
        const actionButton = within(rows[0]).getByTestId('euiCollapsedItemActionsButton');
        await user.click(actionButton);

        const contextMenuPanel = document.querySelector('.euiContextMenuPanel');
        const buttons = contextMenuPanel.querySelectorAll('button.euiContextMenuItem');
        const buttonLabels = Array.from(buttons).map((btn) => btn.textContent);

        expect(buttonLabels).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should have the "resume", "edit" and "unfollow" options in the row context menu for paused index', async () => {
        const rows = getTableRows('followerIndexListTable');
        const actionButton = within(rows[1]).getByTestId('euiCollapsedItemActionsButton');
        await user.click(actionButton);

        const contextMenuPanel = document.querySelector('.euiContextMenuPanel');
        const buttons = contextMenuPanel.querySelectorAll('button.euiContextMenuItem');
        const buttonLabels = Array.from(buttons).map((btn) => btn.textContent);

        expect(buttonLabels).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', async () => {
        expect(screen.queryByTestId('pauseReplicationConfirmation')).not.toBeInTheDocument();

        const rows = getTableRows('followerIndexListTable');
        const actionButton = within(rows[0]).getByTestId('euiCollapsedItemActionsButton');
        await user.click(actionButton);

        const pauseButton = await screen.findByTestId('pauseButton');
        await user.click(pauseButton);

        expect(await screen.findByTestId('pauseReplicationConfirmation')).toBeInTheDocument();
      });

      test('should open a confirmation modal when clicking on "resume"', async () => {
        expect(screen.queryByTestId('resumeReplicationConfirmation')).not.toBeInTheDocument();

        const rows = getTableRows('followerIndexListTable');
        const actionButton = within(rows[1]).getByTestId('euiCollapsedItemActionsButton');
        await user.click(actionButton);

        const resumeButton = await screen.findByTestId('resumeButton');
        await user.click(resumeButton);

        expect(await screen.findByTestId('resumeReplicationConfirmation')).toBeInTheDocument();
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', async () => {
        expect(screen.queryByTestId('unfollowLeaderConfirmation')).not.toBeInTheDocument();

        const rows = getTableRows('followerIndexListTable');
        const actionButton = within(rows[0]).getByTestId('euiCollapsedItemActionsButton');
        await user.click(actionButton);

        const unfollowButton = await screen.findByTestId('unfollowButton');
        await user.click(unfollowButton);

        expect(await screen.findByTestId('unfollowLeaderConfirmation')).toBeInTheDocument();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/142774
    describe.skip('detail panel', () => {
      test('should open a detail panel when clicking on a follower index', async () => {
        expect(screen.queryByTestId('followerIndexDetail')).not.toBeInTheDocument();

        const rows = getTableRows('followerIndexListTable');
        const nameLink = within(rows[0]).getByText(index1.name);
        await user.click(nameLink);

        expect(await screen.findByTestId('followerIndexDetail')).toBeInTheDocument();
      });

      test('should set the title the index that has been selected', async () => {
        const rows = getTableRows('followerIndexListTable');
        const nameLink = within(rows[0]).getByText(index1.name);
        await user.click(nameLink);

        const title = await screen.findByTestId('followerIndexDetail.title');
        expect(title.textContent).toEqual(index1.name);
      });

      test('should indicate the correct "status", "remote cluster" and "leader index"', async () => {
        const rows = getTableRows('followerIndexListTable');
        const nameLink = within(rows[0]).getByText(index1.name);
        await user.click(nameLink);

        const status = await screen.findByTestId('followerIndexDetail.status');
        const remoteCluster = await screen.findByTestId('followerIndexDetail.remoteCluster');
        const leaderIndex = await screen.findByTestId('followerIndexDetail.leaderIndex');

        expect(status.textContent).toEqual(index1.status);
        expect(remoteCluster.textContent).toEqual(index1.remoteCluster);
        expect(leaderIndex.textContent).toEqual(index1.leaderIndex);
      });

      test('should have a "settings" section', async () => {
        const rows = getTableRows('followerIndexListTable');
        const nameLink = within(rows[0]).getByText(index1.name);
        await user.click(nameLink);

        const settingsSection = await screen.findByTestId('followerIndexDetail.settingsSection');
        const heading = within(settingsSection).getByRole('heading', { level: 3 });
        expect(heading.textContent).toEqual('Settings');

        expect(screen.getByTestId('followerIndexDetail.settingsValues')).toBeInTheDocument();
      });

      test('should set the correct follower index settings values', async () => {
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
          readPollTimeout: 'readPollTimeout',
        };

        const rows = getTableRows('followerIndexListTable');
        const nameLink = within(rows[0]).getByText(index1.name);
        await user.click(nameLink);

        await screen.findByTestId('followerIndexDetail.settingsValues');

        Object.entries(mapSettingsToFollowerIndexProp).forEach(([setting, prop]) => {
          const element = screen.getByTestId(`settingsValues.${setting}`);
          expect(element.textContent).toEqual(index1[prop].toString());
        });
      });

      test('should not have settings values for a "paused" follower index', async () => {
        const rows = getTableRows('followerIndexListTable');
        const nameLink = within(rows[1]).getByText(index2.name);
        await user.click(nameLink);

        await screen.findByTestId('followerIndexDetail.settingsSection');

        expect(screen.queryByTestId('followerIndexDetail.settingsValues')).not.toBeInTheDocument();

        const settingsSection = screen.getByTestId('followerIndexDetail.settingsSection');
        expect(settingsSection.textContent).toContain(
          'paused follower index does not have settings'
        );
      });

      // FLAKY: https://github.com/elastic/kibana/issues/100951
      test.skip('should have a section to render the follower index shards stats', async () => {
        const rows = getTableRows('followerIndexListTable');
        const nameLink = within(rows[0]).getByText(index1.name);
        await user.click(nameLink);

        expect(
          await screen.findByTestId('followerIndexDetail.shardsStatsSection')
        ).toBeInTheDocument();

        const codeBlocks = screen.queryAllByTestId('shardsStats');
        expect(codeBlocks.length).toBe(index1.shards.length);

        codeBlocks.forEach((codeBlock, i) => {
          expect(JSON.parse(codeBlock.textContent)).toEqual(index1.shards[i]);
        });
      });
    });
  });
});
