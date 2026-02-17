/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, act } from '@testing-library/react';
import { EuiTableTestHarness } from '@kbn/test-eui-helpers';

import './mocks';
import { getAutoFollowPatternMock } from './fixtures/auto_follow_pattern';
import { setupEnvironment, pageHelpers, getRandomString } from './helpers';

const { setup } = pageHelpers.autoFollowPatternList;

const getActionsCell = (testId, rowIndex = 0) => {
  const table = new EuiTableTestHarness(testId);
  const tableRows = table.getRows();
  return within(tableRows[rowIndex]).getAllByRole('cell').pop();
};

describe('<AutoFollowPatternList />', () => {
  let httpRequestsMockHelpers;
  let httpSetup;
  let user;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse();
    httpRequestsMockHelpers.setDeleteAutoFollowPatternResponse();
    httpRequestsMockHelpers.setAutoFollowStatsResponse();
  });

  describe('on component mount', () => {
    beforeEach(() => {
      // Override HTTP mocks to return never-resolving promises
      // This keeps the component in LOADING state without triggering act warnings
      httpSetup.get.mockImplementation(() => new Promise(() => {}));

      ({ user } = setup());
    });

    test('should show a loading indicator on component', () => {
      expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
    });
  });

  describe('when there are no auto-follow patterns', () => {
    beforeEach(async () => {
      ({ user } = setup());
      // Wait for HTTP request to complete
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should display an empty prompt', () => {
      expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    });

    test('should have a button to create a follower index', () => {
      expect(screen.getByTestId('createAutoFollowPatternButton')).toBeInTheDocument();
    });
  });

  describe('when there are multiple pages of auto-follow patterns', () => {
    let actions;

    beforeEach(async () => {
      const autoFollowPatterns = [
        getAutoFollowPatternMock({ name: 'unique', followPattern: '{{leader_index}}' }),
      ];

      for (let i = 0; i < 29; i++) {
        autoFollowPatterns.push(
          getAutoFollowPatternMock({ name: `${i}`, followPattern: '{{leader_index}}' })
        );
      }

      httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({ patterns: autoFollowPatterns });

      ({ user, actions } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('pagination works', async () => {
      await actions.clickPaginationNextButton();

      const table = new EuiTableTestHarness('autoFollowPatternListTable');
      // Pagination defaults to 20 auto-follow patterns per page. We loaded 30 auto-follow patterns,
      // so the second page should have 10.
      expect(table.getCellValues().length).toBe(10);
    });

    test('search works', async () => {
      await actions.search('unique');

      const table = new EuiTableTestHarness('autoFollowPatternListTable');
      expect(table.getCellValues().length).toBe(1);
    });
  });

  describe('when there are auto-follow patterns', () => {
    let actions;

    // For deterministic tests, we need to make sure that autoFollowPattern1 comes before autoFollowPattern2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name with "a" and "b" to make sure that autoFollowPattern1 comes before autoFollowPattern2
    const testPrefix = 'prefix_';
    const testSuffix = '_suffix';

    const autoFollowPattern1 = getAutoFollowPatternMock({
      name: `a${getRandomString()}`,
      followIndexPattern: `${testPrefix}{{leader_index}}${testSuffix}`,
    });
    const autoFollowPattern2 = getAutoFollowPatternMock({
      name: `b${getRandomString()}`,
      followIndexPattern: '{{leader_index}}', // no prefix nor suffix
    });
    const autoFollowPatterns = [autoFollowPattern1, autoFollowPattern2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({ patterns: autoFollowPatterns });

      ({ user, actions } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should not display the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });

    test('should have a button to create an auto-follow pattern', () => {
      expect(screen.getByTestId('createAutoFollowPatternButton')).toBeInTheDocument();
    });

    test('should list the auto-follow patterns in the table', () => {
      const table = new EuiTableTestHarness('autoFollowPatternListTable');
      const tableCellsValues = table.getCellValues();
      expect(tableCellsValues.length).toEqual(autoFollowPatterns.length);
      // Check key columns (status includes non-breaking space from EUI component)
      expect(tableCellsValues.length).toBe(2);
      expect(tableCellsValues[0][1]).toBe(autoFollowPattern1.name);
      expect(tableCellsValues[0][2]).toContain('Paused');
      expect(tableCellsValues[0][3]).toBe(autoFollowPattern1.remoteCluster);
      expect(tableCellsValues[0][4]).toBe(autoFollowPattern1.leaderIndexPatterns.join(', '));
      expect(tableCellsValues[0][5]).toBe(testPrefix);
      expect(tableCellsValues[0][6]).toBe(testSuffix);

      expect(tableCellsValues[1][1]).toBe(autoFollowPattern2.name);
      expect(tableCellsValues[1][2]).toContain('Paused');
      expect(tableCellsValues[1][3]).toBe(autoFollowPattern2.remoteCluster);
      expect(tableCellsValues[1][4]).toBe(autoFollowPattern2.leaderIndexPatterns.join(', '));
    });

    describe('manage patterns context menu button', () => {
      test('should be visible when an auto-follow pattern is selected', async () => {
        expect(screen.queryByTestId('autoFollowPatternActionMenuButton')).not.toBeInTheDocument();

        await actions.selectAutoFollowPatternAt(0);

        expect(screen.getByTestId('autoFollowPatternActionMenuButton')).toBeInTheDocument();
      });

      test('should update the button label according to the number of patterns selected', async () => {
        await actions.selectAutoFollowPatternAt(0); // 1 auto-follow pattern selected
        expect(screen.getByTestId('autoFollowPatternActionMenuButton').textContent).toEqual(
          'Manage pattern'
        );

        await actions.selectAutoFollowPatternAt(1); // 2 auto-follow patterns selected
        expect(screen.getByTestId('autoFollowPatternActionMenuButton').textContent).toEqual(
          'Manage patterns'
        );
      });

      test('should open a confirmation modal when clicking the delete button', async () => {
        expect(screen.queryByTestId('deleteAutoFollowPatternConfirmation')).not.toBeInTheDocument();

        await actions.selectAutoFollowPatternAt(0);
        await actions.clickBulkDeleteButton();

        expect(screen.getByTestId('deleteAutoFollowPatternConfirmation')).toBeInTheDocument();
      });

      test('should remove the auto-follow pattern from the table after delete is complete', async () => {
        // Make sure that we have our 2 auto-follow patterns in the table
        const table = new EuiTableTestHarness('autoFollowPatternListTable');
        expect(table.getCellValues().length).toBe(2);

        // We will delete the *first* auto-follow pattern in the table
        httpRequestsMockHelpers.setDeleteAutoFollowPatternResponse(autoFollowPattern1.name, {
          itemsDeleted: [autoFollowPattern1.name],
        });
        // After delete, the list loader will fetch again; return remaining item
        httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({
          patterns: [autoFollowPattern2],
        });

        await actions.selectAutoFollowPatternAt(0);
        await actions.clickBulkDeleteButton();
        await actions.clickConfirmModalDeleteAutoFollowPattern();

        const tableCellsValues = table.getCellValues();
        expect(tableCellsValues.length).toBe(1);
        expect(tableCellsValues[0][1]).toEqual(autoFollowPattern2.name);
      });
    });

    describe('table row actions', () => {
      test('should have a "pause", "delete" and "edit" action button on each row', async () => {
        const contextMenuButton = within(getActionsCell('autoFollowPatternListTable')).getByRole(
          'button'
        );

        await user.click(contextMenuButton);

        expect(screen.getByTestId('contextMenuDeleteButton')).toBeInTheDocument();
        expect(screen.getByTestId('contextMenuEditButton')).toBeInTheDocument();
        expect(screen.getByTestId('contextMenuResumeButton')).toBeInTheDocument();
      });

      test('should open a confirmation modal when clicking on "delete" button', async () => {
        expect(screen.queryByTestId('deleteAutoFollowPatternConfirmation')).not.toBeInTheDocument();

        const contextMenuButton = within(getActionsCell('autoFollowPatternListTable')).getByRole(
          'button'
        );
        await user.click(contextMenuButton);

        const deleteButton = screen.getByTestId('contextMenuDeleteButton');
        await user.click(deleteButton);

        expect(screen.getByTestId('deleteAutoFollowPatternConfirmation')).toBeInTheDocument();
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on an auto-follow pattern', async () => {
        expect(screen.queryByTestId('autoFollowPatternDetail')).not.toBeInTheDocument();

        await actions.clickAutoFollowPatternAt(0);

        expect(screen.getByTestId('autoFollowPatternDetail')).toBeInTheDocument();
      });

      test('should set the title the auto-follow pattern that has been selected', async () => {
        await actions.clickAutoFollowPatternAt(0);

        const title = within(screen.getByTestId('autoFollowPatternDetail')).getByTestId('title');
        expect(title.textContent).toEqual(autoFollowPattern1.name);
      });

      test('should have a "settings" section', async () => {
        await actions.clickAutoFollowPatternAt(0);

        const settingsSection = screen.getByTestId('settingsSection');
        expect(within(settingsSection).getByText('Settings')).toBeInTheDocument();

        // The number of different settings of an auto-follower pattern
        const AVAILABLE_SETTINGS = 4;
        const settingsValues = within(settingsSection).getAllByTestId('settingsValues');
        expect(settingsValues.length).toBe(AVAILABLE_SETTINGS);
      });

      test('should set the correct auto-follow pattern settings values', async () => {
        await actions.clickAutoFollowPatternAt(0);

        expect(screen.getByTestId('remoteCluster').textContent).toEqual(
          autoFollowPattern1.remoteCluster
        );
        expect(screen.getByTestId('leaderIndexPatterns').textContent).toEqual(
          autoFollowPattern1.leaderIndexPatterns.join(', ')
        );
        expect(screen.getByTestId('patternPrefix').textContent).toEqual(testPrefix);
        expect(screen.getByTestId('patternSuffix').textContent).toEqual(testSuffix);
      });

      test('should have a default value when there are no prefix or no suffix', async () => {
        await actions.clickAutoFollowPatternAt(1); // Does not have prefix and suffix

        expect(screen.getByTestId('patternPrefix').textContent).toEqual('No prefix');
        expect(screen.getByTestId('patternSuffix').textContent).toEqual('No suffix');
      });

      test('should show a preview of the indices that might be generated by the auto-follow pattern', async () => {
        await actions.clickAutoFollowPatternAt(0);

        expect(screen.getByTestId('indicesPreviewSection')).toBeInTheDocument();
        // Count list items within the preview section
        const previewSection = screen.getByTestId('indicesPreviewSection');
        const items = within(previewSection).queryAllByTestId('indexPreview');
        expect(items.length).toBe(3);
      });

      test('should have a link to view the indices in Index Management', async () => {
        await actions.clickAutoFollowPatternAt(0);

        const link = screen.getByTestId('viewIndexManagementLink');
        expect(link).toBeInTheDocument();
        expect(link.textContent).toBe('View your follower indices in Index Management');
      });

      test('should have a "close", "delete", "edit" and "resume" button in the footer', async () => {
        await actions.clickAutoFollowPatternAt(0);

        const detailPanel = screen.getByTestId('autoFollowPatternDetail');
        const closeButton = within(detailPanel).getByTestId('closeFlyoutButton');
        expect(closeButton).toBeInTheDocument();

        const actionMenuButton = screen.getByTestId('autoFollowPatternActionMenuButton');
        await user.click(actionMenuButton);

        const contextMenu = screen.getByTestId('autoFollowPatternActionContextMenu');
        const menuButtons = within(contextMenu).getAllByRole('button');

        expect(menuButtons[0].textContent).toEqual('Resume replication');
        expect(menuButtons[1].textContent).toEqual('Edit pattern');
        expect(menuButtons[2].textContent).toEqual('Delete pattern');
      });

      test('should close the detail panel when clicking the "close" button', async () => {
        await actions.clickAutoFollowPatternAt(0);
        expect(screen.getByTestId('autoFollowPatternDetail')).toBeInTheDocument();

        const closeButton = screen.getByTestId('closeFlyoutButton');
        await user.click(closeButton);

        expect(screen.queryByTestId('autoFollowPatternDetail')).not.toBeInTheDocument();
      });

      test('should open a confirmation modal when clicking the "delete" button', async () => {
        await actions.clickAutoFollowPatternAt(0);
        expect(screen.queryByTestId('deleteAutoFollowPatternConfirmation')).not.toBeInTheDocument();

        const actionMenuButton = screen.getByTestId('autoFollowPatternActionMenuButton');
        await user.click(actionMenuButton);

        const contextMenu = screen.getByTestId('autoFollowPatternActionContextMenu');
        const deleteButton = within(contextMenu).getAllByRole('button')[2];
        await user.click(deleteButton);

        expect(screen.getByTestId('deleteAutoFollowPatternConfirmation')).toBeInTheDocument();
      });

      test('should display the recent errors', async () => {
        const message = 'bar';
        // Only pattern 2 should have errors, pattern 1 should not
        const recentAutoFollowErrors = [
          {
            timestamp: 1587081600021,
            leaderIndex: `${autoFollowPattern2.name}:my-leader-test`,
            autoFollowException: { type: 'exception', reason: message },
          },
        ];
        httpRequestsMockHelpers.setAutoFollowStatsResponse({ recentAutoFollowErrors });

        await actions.clickAutoFollowPatternAt(0);

        // Wait for detail panel to open
        const detailPanel1 = await screen.findByTestId('autoFollowPatternDetail');
        expect(within(detailPanel1).queryByTestId('errors')).not.toBeInTheDocument();

        // Select the other pattern - stats are fetched on selection change
        await actions.clickAutoFollowPatternAt(1);

        // Wait for errors to appear
        const detailPanel2 = await screen.findByTestId('autoFollowPatternDetail');
        expect(await within(detailPanel2).findByTestId('errors')).toBeInTheDocument();
        expect(within(detailPanel2).getByTestId('titleErrors')).toBeInTheDocument();

        const errors = within(detailPanel2).queryAllByTestId('recentError');
        expect(errors.map((error) => error.textContent)).toEqual([
          'April 16th, 2020 8:00:00 PM: bar',
        ]);
      });
    });
  });
});
