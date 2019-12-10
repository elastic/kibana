/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { WatchStatusTestBed } from './helpers/watch_status.helpers';
import { WATCH } from './helpers/constants';
import { getWatchHistory } from '../../test/fixtures';
import moment from 'moment';
import { ROUTES } from '../../common/constants';
import { WATCH_STATES, ACTION_STATES } from '../../common/constants';

const { API_ROOT } = ROUTES;

const { setup } = pageHelpers.watchStatus;

const watchHistory1 = getWatchHistory({ startTime: '2019-06-04T01:11:11.294' });
const watchHistory2 = getWatchHistory({ startTime: '2019-06-04T01:10:10.987Z' });

const watchHistoryItems = { watchHistoryItems: [watchHistory1, watchHistory2] };

const ACTION_ID = 'my_logging_action_1';

const watch = {
  ...WATCH.watch,
  watchStatus: {
    state: WATCH_STATES.FIRING,
    isActive: true,
    actionStatuses: [
      {
        id: ACTION_ID,
        state: ACTION_STATES.FIRING,
        isAckable: true,
      },
    ],
  },
};

describe('<WatchStatus />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchStatusTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadWatchResponse({ watch });
      httpRequestsMockHelpers.setLoadWatchHistoryResponse(watchHistoryItems);

      testBed = await setup();

      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    test('should set the correct page title', () => {
      const { find } = testBed;

      expect(find('pageTitle').text()).toBe(`Current status for '${watch.name}'`);
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('tab').length).toBe(2);
        expect(find('tab').map(t => t.text())).toEqual(['Execution history', 'Action statuses']);
      });

      test('should navigate to the "Action statuses" tab', () => {
        const { exists, actions } = testBed;

        expect(exists('watchHistorySection')).toBe(true);
        expect(exists('watchDetailSection')).toBe(false);

        actions.selectTab('action statuses');

        expect(exists('watchHistorySection')).toBe(false);
        expect(exists('watchDetailSection')).toBe(true);
      });
    });

    describe('execution history', () => {
      test('should list history items in the table', () => {
        const { table } = testBed;
        const { tableCellsValues } = table.getMetaData('watchHistoryTable');

        const getExpectedValue = (value: any) => (typeof value === 'undefined' ? '' : value);

        tableCellsValues.forEach((row, i) => {
          const historyItem = watchHistoryItems.watchHistoryItems[i];
          const { startTime, watchStatus } = historyItem;

          expect(row).toEqual([
            getExpectedValue(moment(startTime).format()),
            getExpectedValue(watchStatus.state),
            getExpectedValue(watchStatus.comment),
          ]);
        });
      });

      test('should show execution history details on click', async () => {
        const { actions, exists } = testBed;

        const watchHistoryItem = {
          ...watchHistory1,
          watchId: watch.id,
          watchStatus: {
            state: WATCH_STATES.FIRING,
            actionStatuses: [
              {
                id: 'my_logging_action_1',
                state: ACTION_STATES.FIRING,
                isAckable: true,
              },
            ],
          },
        };

        const formattedStartTime = moment(watchHistoryItem.startTime).format();

        httpRequestsMockHelpers.setLoadWatchHistoryItemResponse({ watchHistoryItem });

        await actions.clickWatchExecutionAt(0, formattedStartTime);

        const latestRequest = server.requests[server.requests.length - 1];

        expect(latestRequest.method).toBe('GET');
        expect(latestRequest.url).toBe(`${API_ROOT}/history/${watchHistoryItem.id}`);

        expect(exists('watchHistoryDetailFlyout')).toBe(true);
      });
    });

    describe('delete watch', () => {
      test('should show a confirmation when clicking the delete button', async () => {
        const { actions } = testBed;

        await actions.clickDeleteWatchButton();

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        expect(
          document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]')
        ).not.toBe(null);

        expect(
          document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]')!.textContent
        ).toContain('Delete watch');
      });

      test('should send the correct HTTP request to delete watch', async () => {
        const { component, actions } = testBed;

        await actions.clickDeleteWatchButton();

        const modal = document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        httpRequestsMockHelpers.setDeleteWatchResponse({
          results: {
            successes: [watch.id],
            errors: [],
          },
        });

        await act(async () => {
          confirmButton!.click();
          await nextTick();
          component.update();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        expect(latestRequest.method).toBe('POST');
        expect(latestRequest.url).toBe(`${API_ROOT}/watches/delete`);
      });
    });

    describe('activate & deactive watch', () => {
      test('should send the correct HTTP request to deactivate and activate a watch', async () => {
        const { actions } = testBed;

        httpRequestsMockHelpers.setDeactivateWatchResponse({
          watchStatus: {
            state: WATCH_STATES.DISABLED,
            isActive: false,
          },
        });

        await actions.clickToggleActivationButton();

        const deactivateRequest = server.requests[server.requests.length - 1];

        expect(deactivateRequest.method).toBe('PUT');
        expect(deactivateRequest.url).toBe(`${API_ROOT}/watch/${watch.id}/deactivate`);

        httpRequestsMockHelpers.setActivateWatchResponse({
          watchStatus: {
            state: WATCH_STATES.FIRING,
            isActive: true,
          },
        });

        await actions.clickToggleActivationButton();

        const activateRequest = server.requests[server.requests.length - 1];

        expect(activateRequest.method).toBe('PUT');
        expect(activateRequest.url).toBe(`${API_ROOT}/watch/${watch.id}/activate`);
      });
    });

    describe('action statuses', () => {
      beforeEach(() => {
        const { actions } = testBed;

        actions.selectTab('action statuses');
      });

      test('should list the watch actions in a table', () => {
        const { table } = testBed;
        const { tableCellsValues } = table.getMetaData('watchActionStatusTable');

        tableCellsValues.forEach((row, i) => {
          const action = watch.watchStatus.actionStatuses[i];
          const { id, state, isAckable } = action;

          expect(row).toEqual([id, state, isAckable ? 'Acknowledge' : '']);
        });
      });

      test('should allow an action to be acknowledged', async () => {
        const { actions, table } = testBed;

        httpRequestsMockHelpers.setAcknowledgeWatchResponse({
          watchStatus: {
            state: WATCH_STATES.FIRING,
            isActive: true,
            comment: 'Acked',
            actionStatuses: [
              {
                id: ACTION_ID,
                state: ACTION_STATES.ACKNOWLEDGED,
                isAckable: false,
              },
            ],
          },
        });

        await actions.clickAcknowledgeButton(0);

        const latestRequest = server.requests[server.requests.length - 1];

        expect(latestRequest.method).toBe('PUT');
        expect(latestRequest.url).toBe(
          `${API_ROOT}/watch/${watch.id}/action/${ACTION_ID}/acknowledge`
        );

        const { tableCellsValues } = table.getMetaData('watchActionStatusTable');

        tableCellsValues.forEach(row => {
          expect(row).toEqual([ACTION_ID, ACTION_STATES.ACKNOWLEDGED, '']);
        });
      });
    });
  });
});
