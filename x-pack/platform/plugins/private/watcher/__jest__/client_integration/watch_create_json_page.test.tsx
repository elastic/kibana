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
import '@kbn/code-editor-mock/jest_helper';

import { getExecuteDetails } from '../../__fixtures__';
import { API_BASE_PATH, WATCH_TYPES } from '../../common/constants';
import { defaultWatch } from '../../public/application/models/watch';
import { WATCH } from './helpers/jest_constants';
import type { HttpSetup } from '@kbn/core/public';
import { WatchEditPage } from '../../public/application/sections/watch_edit_page/watch_edit_page';
import { registerRouter } from '../../public/application/lib/navigation';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';

const renderCreateJsonWatch = (httpSetup: HttpSetup) => {
  const Wrapped = WithAppDependencies(WatchEditPage, httpSetup);
  render(
    <I18nProvider>
      <Wrapped match={{ params: { id: undefined, type: WATCH_TYPES.JSON } }} />
    </I18nProvider>
  );
};

const selectSimulateTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText('Simulate'));
  await screen.findByTestId('jsonWatchSimulateForm');
};

describe('<JsonWatchEditPage /> create route', () => {
  let httpSetup: HttpSetup;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let routerHistoryPush: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
    routerHistoryPush = jest.fn();
    registerRouter({ history: { push: routerHistoryPush } });

    renderCreateJsonWatch(httpSetup);
    await screen.findByTestId('jsonWatchForm');
  });

  test('should set the correct page title', () => {
    expect(screen.getByTestId('pageTitle')).toHaveTextContent('Create advanced watch');
  });

  describe('tabs', () => {
    test('should have 2 tabs', () => {
      const tabs = screen.getAllByTestId('tab');
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.textContent)).toEqual(['Edit', 'Simulate']);
    });

    test('should navigate to the "Simulate" tab', async () => {
      const user = userEvent.setup();

      expect(screen.getByTestId('jsonWatchForm')).toBeInTheDocument();
      expect(screen.queryByTestId('jsonWatchSimulateForm')).not.toBeInTheDocument();

      // Set watch id (required field) and switch to simulate tab
      fireEvent.change(screen.getByTestId('idInput'), { target: { value: WATCH.watch.id } });
      await selectSimulateTab(user);

      await waitFor(() => {
        expect(screen.queryByTestId('jsonWatchForm')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('jsonWatchSimulateForm')).toBeInTheDocument();
    });
  });

  describe('create', () => {
    describe('form validation', () => {
      test('should not allow empty ID field', async () => {
        const user = userEvent.setup();
        fireEvent.change(screen.getByTestId('idInput'), { target: { value: '' } });

        await user.click(screen.getByTestId('saveWatchButton'));
        expect(await screen.findByText('ID is required')).toBeInTheDocument();
      });

      test('should not allow invalid characters for ID field', async () => {
        const user = userEvent.setup();
        fireEvent.change(screen.getByTestId('idInput'), { target: { value: 'invalid$id*field/' } });

        await user.click(screen.getByTestId('saveWatchButton'));
        expect(
          await screen.findByText(
            'ID can only contain letters, underscores, dashes, periods and numbers.'
          )
        ).toBeInTheDocument();
      });
    });

    describe('form payload & API errors', () => {
      test('should send the correct payload', async () => {
        const user = userEvent.setup();
        const { watch } = WATCH;

        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: watch.name } });
        fireEvent.change(screen.getByTestId('idInput'), { target: { value: watch.id } });

        await user.click(screen.getByTestId('saveWatchButton'));

        const DEFAULT_LOGGING_ACTION_ID = 'logging_1';
        const DEFAULT_LOGGING_ACTION_TYPE = 'logging';
        const DEFAULT_LOGGING_ACTION_TEXT =
          'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.';

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/${watch.id}`,
            expect.objectContaining({
              body: JSON.stringify({
                id: watch.id,
                name: watch.name,
                type: watch.type,
                isNew: true,
                isActive: true,
                actions: [
                  {
                    id: DEFAULT_LOGGING_ACTION_ID,
                    type: DEFAULT_LOGGING_ACTION_TYPE,
                    text: DEFAULT_LOGGING_ACTION_TEXT,
                    [DEFAULT_LOGGING_ACTION_TYPE]: {
                      text: DEFAULT_LOGGING_ACTION_TEXT,
                    },
                  },
                ],
                watch: defaultWatch,
              }),
            })
          );
        });

        expect(routerHistoryPush).toHaveBeenCalledWith({ pathname: '/watches' });
      });

      test('should surface the API errors from the "save" HTTP request', async () => {
        const user = userEvent.setup();
        const { watch } = WATCH;

        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: watch.name } });
        fireEvent.change(screen.getByTestId('idInput'), { target: { value: watch.id } });

        const error: import('./helpers/http_requests').ResponseError = {
          statusCode: 400,
          message: 'Watch payload is invalid',
          response: {},
        };

        httpRequestsMockHelpers.setSaveWatchResponse(watch.id, undefined, error);

        await user.click(screen.getByTestId('saveWatchButton'));

        const sectionError = await screen.findByTestId('sectionError');
        expect(sectionError).toHaveTextContent(error.message as string);
      });
    });
  });

  describe('simulate', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      // Set watch id (required field) and switch to simulate tab
      fireEvent.change(screen.getByTestId('idInput'), { target: { value: WATCH.watch.id } });
      await selectSimulateTab(user);
    });

    describe('form payload & API errors', () => {
      test('should execute a watch with no input', async () => {
        const user = userEvent.setup();
        const {
          watch: { id, type },
        } = WATCH;

        await user.click(screen.getByTestId('simulateWatchButton'));

        const actionModes = Object.keys(defaultWatch.actions).reduce<Record<string, string>>(
          (actionAccum, action) => {
            actionAccum[action] = 'simulate';
            return actionAccum;
          },
          {}
        );

        const executedWatch = {
          id,
          type,
          isNew: true,
          isActive: true,
          actions: [],
          watch: defaultWatch,
        };

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  actionModes,
                }),
                watch: executedWatch,
              }),
            })
          );
        });
      });

      test('should execute a watch with a valid payload', async () => {
        const user = userEvent.setup();
        const {
          watch: { id, type },
        } = WATCH;

        const SCHEDULED_TIME = '5';
        const TRIGGERED_TIME = '5';
        const IGNORE_CONDITION = true;
        const ACTION_MODE = 'force_execute';

        fireEvent.change(screen.getByTestId('scheduledTimeInput'), {
          target: { value: SCHEDULED_TIME },
        });
        fireEvent.change(screen.getByTestId('triggeredTimeInput'), {
          target: { value: TRIGGERED_TIME },
        });
        fireEvent.click(screen.getByTestId('ignoreConditionSwitch'));
        fireEvent.change(screen.getByTestId('actionModesSelect'), {
          target: { value: ACTION_MODE },
        });

        expect(screen.queryByTestId('simulateResultsFlyout')).not.toBeInTheDocument();

        httpRequestsMockHelpers.setLoadExecutionResultResponse({
          watchHistoryItem: {
            details: {},
            watchStatus: {
              actionStatuses: [],
            },
          },
        });

        await user.click(screen.getByTestId('simulateWatchButton'));

        const actionModes = Object.keys(defaultWatch.actions).reduce<Record<string, string>>(
          (actionAccum, action) => {
            actionAccum[action] = ACTION_MODE;
            return actionAccum;
          },
          {}
        );

        const executedWatch = {
          id,
          type,
          isNew: true,
          isActive: true,
          actions: [],
          watch: defaultWatch,
        };

        const triggeredTime = `now+${TRIGGERED_TIME}s`;
        const scheduledTime = `now+${SCHEDULED_TIME}s`;

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/watch/execute`,
            expect.objectContaining({
              body: JSON.stringify({
                executeDetails: getExecuteDetails({
                  triggerData: {
                    triggeredTime,
                    scheduledTime,
                  },
                  ignoreCondition: IGNORE_CONDITION,
                  actionModes,
                }),
                watch: executedWatch,
              }),
            })
          );
        });

        expect(await screen.findByTestId('simulateResultsFlyout')).toBeInTheDocument();
        expect(screen.getByTestId('simulateResultsFlyoutTitle')).toHaveTextContent(
          'Simulation results'
        );
      });
    });

    describe('results flyout', () => {
      test.each([
        { actionMode: 'simulate', conditionMet: true, expectedStatus: 'simulated' },
        { actionMode: 'simulate', conditionMet: false, expectedStatus: 'not simulated' },
        { actionMode: 'force_simulate', conditionMet: true, expectedStatus: 'simulated' },
        { actionMode: 'force_simulate', conditionMet: false, expectedStatus: 'not simulated' },
        { actionMode: 'execute', conditionMet: true, expectedStatus: 'executed' },
        { actionMode: 'execute', conditionMet: false, expectedStatus: 'not executed' },
        { actionMode: 'force_execute', conditionMet: true, expectedStatus: 'executed' },
        { actionMode: 'force_execute', conditionMet: false, expectedStatus: 'not executed' },
        { actionMode: 'skip', conditionMet: true, expectedStatus: 'throttled' },
        { actionMode: 'skip', conditionMet: false, expectedStatus: 'throttled' },
      ])(
        'should render correct table status for $actionMode (conditionMet=$conditionMet)',
        async ({ actionMode, conditionMet, expectedStatus }) => {
          const user = userEvent.setup();

          fireEvent.change(screen.getByTestId('actionModesSelect'), {
            target: { value: actionMode },
          });

          const ACTION_NAME = Object.keys(defaultWatch.actions)[0];
          const ACTION_TYPE = 'logging';
          const ACTION_STATE = 'OK';

          httpRequestsMockHelpers.setLoadExecutionResultResponse({
            watchHistoryItem: {
              details: {
                result: {
                  condition: {
                    met: conditionMet,
                  },
                  actions:
                    (conditionMet && [
                      {
                        id: ACTION_NAME,
                        type: ACTION_TYPE,
                        status: expectedStatus,
                      },
                    ]) ||
                    [],
                },
              },
              watchStatus: {
                actionStatuses: [
                  {
                    id: ACTION_NAME,
                    state: ACTION_STATE,
                  },
                ],
              },
            },
          });

          await user.click(screen.getByTestId('simulateWatchButton'));

          expect(await screen.findByTestId('simulateResultsFlyout')).toBeInTheDocument();
          if (conditionMet) {
            expect(screen.getByTestId('conditionMetStatus')).toBeInTheDocument();
          } else {
            expect(screen.getByTestId('conditionNotMetStatus')).toBeInTheDocument();
          }

          const table = screen.getByTestId('simulateResultsTable');
          expect(table).toHaveTextContent(ACTION_NAME);
          expect(table).toHaveTextContent(ACTION_TYPE);
          expect(table).toHaveTextContent(actionMode);
          expect(table).toHaveTextContent(ACTION_STATE);
          expect(table).toHaveTextContent(expectedStatus);
        }
      );

      test('when API returns no results, flyout renders and condition status is not displayed', async () => {
        const user = userEvent.setup();

        httpRequestsMockHelpers.setLoadExecutionResultResponse({
          watchHistoryItem: {
            details: {
              result: {},
            },
            watchStatus: {
              actionStatuses: [],
            },
          },
        });

        await user.click(screen.getByTestId('simulateWatchButton'));

        expect(await screen.findByTestId('simulateResultsFlyout')).toBeInTheDocument();
        expect(screen.getByTestId('simulateResultsFlyoutTitle')).toBeInTheDocument();
        expect(screen.queryByTestId('conditionMetStatus')).not.toBeInTheDocument();
        expect(screen.queryByTestId('conditionNotMetStatus')).not.toBeInTheDocument();
      });
    });
  });
});
