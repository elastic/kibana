/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import moment from 'moment';
import { getWatchHistory } from '../../__fixtures__';
import { WATCH_STATES, ACTION_STATES } from '../../common/constants';
import { WATCH, WATCH_ID } from './helpers/jest_constants';
import { API_BASE_PATH } from '../../common/constants';
import type { HttpSetup } from '@kbn/core/public';
import { WatchStatusPage } from '../../public/application/sections/watch_status_page/watch_status_page';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';
import { registerRouter } from '../../public/application/lib/navigation';

const renderWatchStatusPage = (httpSetup: HttpSetup) => {
  const Wrapped = WithAppDependencies(WatchStatusPage, httpSetup);
  render(
    <I18nProvider>
      <Wrapped match={{ params: { id: WATCH_ID } }} />
    </I18nProvider>
  );
};

const watchHistory1 = getWatchHistory({ id: 'a', startTime: '2019-06-04T01:11:11.294' });
const watchHistory2 = getWatchHistory({ id: 'b', startTime: '2019-06-04T01:10:10.987Z' });

const watchHistoryItems = { watchHistoryItems: [watchHistory1, watchHistory2] };

const ACTION_ID = 'my_logging_action_1';

const watch = {
  ...WATCH.watch,
  watchStatus: {
    state: WATCH_STATES.ACTIVE,
    isActive: true,
    lastExecution: moment('2019-06-03T19:44:11.088Z'),
    actionStatuses: [
      {
        id: ACTION_ID,
        state: ACTION_STATES.OK,
        isAckable: true,
        lastExecution: moment('2019-06-03T19:44:11.088Z'),
      },
    ],
  },
};

describe('<WatchStatusPage />', () => {
  let httpSetup: HttpSetup;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let routerHistoryPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
      routerHistoryPush = jest.fn();
      registerRouter({ history: { push: routerHistoryPush } });

      httpRequestsMockHelpers.setLoadWatchResponse(WATCH_ID, { watch });
      httpRequestsMockHelpers.setLoadWatchHistoryResponse(WATCH_ID, watchHistoryItems);

      renderWatchStatusPage(httpSetup);
      await screen.findByTestId('pageTitle');

      // Wait for initial activation state to settle (WatchStatusPage sets this via state update).
      await waitFor(() => {
        expect(screen.getByTestId('toggleWatchActivationButton')).toHaveTextContent('Deactivate');
      });
    });

    test('should set the correct page title', () => {
      expect(screen.getByTestId('pageTitle')).toHaveTextContent(
        `Current status for '${watch.name}'`
      );
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const tabs = screen.getAllByTestId('tab');
        expect(tabs).toHaveLength(2);
        expect(tabs.map((t) => t.textContent)).toEqual(['Execution history', 'Action statuses']);
      });

      test('should navigate to the "Action statuses" tab', async () => {
        expect(screen.getByTestId('watchHistorySection')).toBeInTheDocument();
        expect(screen.queryByTestId('watchDetailSection')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Action statuses'));

        await waitFor(() => {
          expect(screen.queryByTestId('watchHistorySection')).not.toBeInTheDocument();
          expect(screen.getByTestId('watchDetailSection')).toBeInTheDocument();
        });
      });
    });

    describe('execution history', () => {
      test('should list history items in the table', () => {
        watchHistoryItems.watchHistoryItems.forEach((historyItem) => {
          const formattedStartTime = moment(historyItem.startTime).format();
          expect(
            screen.getByTestId(`watchStartTimeColumn-${formattedStartTime}`)
          ).toBeInTheDocument();
        });
      });

      test('should show execution history details on click', async () => {
        const watchHistoryItem = {
          ...watchHistory1,
          watchId: watch.id,
          watchStatus: {
            state: WATCH_STATES.ACTIVE,
            actionStatuses: [
              {
                id: 'my_logging_action_1',
                state: ACTION_STATES.OK,
                isAckable: true,
              },
            ],
          },
        };

        const formattedStartTime = moment(watchHistoryItem.startTime).format();

        httpRequestsMockHelpers.setLoadWatchHistoryItemResponse(watchHistoryItem.id, {
          watchHistoryItem,
        });

        fireEvent.click(screen.getByTestId(`watchStartTimeColumn-${formattedStartTime}`));

        await waitFor(() => {
          expect(httpSetup.get).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/history/${watchHistoryItem.id}`,
            expect.anything()
          );
        });
        expect(await screen.findByTestId('watchHistoryDetailFlyout')).toBeInTheDocument();
      });
    });

    describe('delete watch', () => {
      test('should show a confirmation when clicking the delete button', async () => {
        fireEvent.click(screen.getByTestId('deleteWatchButton'));
        const modal = await screen.findByTestId('deleteWatchesConfirmation');
        expect(modal).toHaveTextContent('Delete watch');
      });

      test('should send the correct HTTP request to delete watch', async () => {
        fireEvent.click(screen.getByTestId('deleteWatchButton'));
        await screen.findByTestId('deleteWatchesConfirmation');
        const confirmButton = screen.getByTestId('confirmModalConfirmButton');

        httpRequestsMockHelpers.setDeleteWatchResponse({
          results: {
            successes: [watch.id],
            errors: [],
          },
        });

        fireEvent.click(confirmButton);

        await waitFor(() => {
          expect(httpSetup.post).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watches/delete`,
            expect.anything()
          );
        });
        expect(routerHistoryPush).toHaveBeenCalledWith({ pathname: '/watches' });
      });
    });

    describe('activate & deactive watch', () => {
      test('should send the correct HTTP request to deactivate and activate a watch', async () => {
        const user = userEvent.setup();

        httpRequestsMockHelpers.setDeactivateWatchResponse(WATCH_ID, {
          watchStatus: {
            state: WATCH_STATES.DISABLED,
            isActive: false,
          },
        });

        await user.click(screen.getByTestId('toggleWatchActivationButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/${watch.id}/deactivate`,
            expect.anything()
          );
        });
        await waitFor(() => {
          expect(screen.getByTestId('toggleWatchActivationButton')).toHaveTextContent('Activate');
        });

        httpRequestsMockHelpers.setActivateWatchResponse(WATCH_ID, {
          watchStatus: {
            state: WATCH_STATES.ACTIVE,
            isActive: true,
          },
        });

        await user.click(screen.getByTestId('toggleWatchActivationButton'));
        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/${watch.id}/activate`,
            expect.anything()
          );
        });
        await waitFor(() => {
          expect(screen.getByTestId('toggleWatchActivationButton')).toHaveTextContent('Deactivate');
        });
      });
    });

    describe('action statuses', () => {
      test('should list the watch actions in a table', () => {
        fireEvent.click(screen.getByText('Action statuses'));
        expect(screen.getByTestId('watchDetailSection')).toBeInTheDocument();

        const actionStatus = watch.watchStatus.actionStatuses[0];
        expect(screen.getByText(actionStatus.id)).toBeInTheDocument();
        expect(screen.getByText(actionStatus.state)).toBeInTheDocument();
        expect(screen.getByText(actionStatus.lastExecution.format())).toBeInTheDocument();
        expect(screen.getByTestId('acknowledgeWatchButton')).toBeInTheDocument();
      });

      test('should allow an action to be acknowledged', async () => {
        fireEvent.click(screen.getByText('Action statuses'));
        expect(screen.getByTestId('watchDetailSection')).toBeInTheDocument();

        const watchHistoryItem = {
          watchStatus: {
            state: WATCH_STATES.ACTIVE,
            isActive: true,
            comment: 'Acked',
            actionStatuses: [
              {
                id: ACTION_ID,
                state: ACTION_STATES.ACKNOWLEDGED,
                isAckable: false,
                lastExecution: moment('2019-06-03T19:44:11.088Z'),
              },
            ],
          },
        };

        httpRequestsMockHelpers.setAcknowledgeWatchResponse(WATCH_ID, ACTION_ID, watchHistoryItem);

        const requestsBefore = jest.mocked(httpSetup.put).mock.calls.length;
        fireEvent.click(screen.getByTestId('acknowledgeWatchButton'));

        await waitFor(() => {
          expect(jest.mocked(httpSetup.put).mock.calls.length).toBeGreaterThan(requestsBefore);
        });
        expect(await screen.findByText(ACTION_STATES.ACKNOWLEDGED)).toBeInTheDocument();

        await waitFor(() => {
          expect(screen.queryByTestId('acknowledgeWatchButton')).not.toBeInTheDocument();
        });
      });
    });
  });
});
