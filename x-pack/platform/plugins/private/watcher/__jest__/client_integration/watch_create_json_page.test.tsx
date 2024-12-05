/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { getExecuteDetails } from '../../__fixtures__';
import { API_BASE_PATH } from '../../common/constants';
import { defaultWatch } from '../../public/application/models/watch';
import { setupEnvironment, pageHelpers } from './helpers';
import type { WatchCreateJsonTestBed } from './helpers/watch_create_json_page.helpers';
import { WATCH } from './helpers/jest_constants';

const { setup } = pageHelpers.watchCreateJsonPage;

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

describe('<JsonWatchEditPage /> create route', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchCreateJsonTestBed;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should set the correct page title', () => {
      const { find } = testBed;
      expect(find('pageTitle').text()).toBe('Create advanced watch');
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('tab').length).toBe(2);
        expect(find('tab').map((t) => t.text())).toEqual(['Edit', 'Simulate']);
      });

      test('should navigate to the "Simulate" tab', async () => {
        const { exists, actions } = testBed;

        expect(exists('jsonWatchForm')).toBe(true);
        expect(exists('jsonWatchSimulateForm')).toBe(false);

        await actions.selectTab('simulate');

        expect(exists('jsonWatchForm')).toBe(false);
        expect(exists('jsonWatchSimulateForm')).toBe(true);
      });
    });

    describe('create', () => {
      describe('form validation', () => {
        test('should not allow empty ID field', async () => {
          const { form, actions } = testBed;
          form.setInputValue('idInput', '');

          await actions.clickSubmitButton();

          expect(form.getErrorsMessages()).toContain('ID is required');
        });
        test('should not allow invalid characters for ID field', async () => {
          const { form, actions } = testBed;
          form.setInputValue('idInput', 'invalid$id*field/');

          await actions.clickSubmitButton();

          expect(form.getErrorsMessages()).toContain(
            'ID can only contain letters, underscores, dashes, periods and numbers.'
          );
        });
      });

      describe('form payload & API errors', () => {
        test('should send the correct payload', async () => {
          const { form, actions } = testBed;
          const { watch } = WATCH;

          form.setInputValue('nameInput', watch.name);
          form.setInputValue('idInput', watch.id);

          await actions.clickSubmitButton();

          const DEFAULT_LOGGING_ACTION_ID = 'logging_1';
          const DEFAULT_LOGGING_ACTION_TYPE = 'logging';
          const DEFAULT_LOGGING_ACTION_TEXT =
            'There are {{ctx.payload.hits.total}} documents in your index. Threshold is 10.';

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

        test('should surface the API errors from the "save" HTTP request', async () => {
          const { form, actions, exists, find } = testBed;
          const { watch } = WATCH;

          form.setInputValue('nameInput', watch.name);
          form.setInputValue('idInput', watch.id);

          const error = {
            statusCode: 400,
            error: 'Bad request',
            message: 'Watch payload is invalid',
            response: {},
          };

          httpRequestsMockHelpers.setSaveWatchResponse(watch.id, undefined, error);

          await actions.clickSubmitButton();

          expect(exists('sectionError')).toBe(true);
          expect(find('sectionError').text()).toContain(error.message);
        });
      });
    });

    describe('simulate', () => {
      beforeEach(async () => {
        const { actions, form } = testBed;

        // Set watch id (required field) and switch to simulate tab
        form.setInputValue('idInput', WATCH.watch.id);

        await actions.selectTab('simulate');
      });

      describe('form payload & API errors', () => {
        test('should execute a watch with no input', async () => {
          const { actions } = testBed;
          const {
            watch: { id, type },
          } = WATCH;

          await actions.clickSimulateButton();

          const actionModes = Object.keys(defaultWatch.actions).reduce(
            (actionAccum: any, action) => {
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

        test('should execute a watch with a valid payload', async () => {
          const { actions, form, find, exists } = testBed;
          const {
            watch: { id, type },
          } = WATCH;

          const SCHEDULED_TIME = '5';
          const TRIGGERED_TIME = '5';
          const IGNORE_CONDITION = true;
          const ACTION_MODE = 'force_execute';

          form.setInputValue('scheduledTimeInput', SCHEDULED_TIME);
          form.setInputValue('triggeredTimeInput', TRIGGERED_TIME);
          form.toggleEuiSwitch('ignoreConditionSwitch');
          form.setInputValue('actionModesSelect', ACTION_MODE);

          expect(exists('simulateResultsFlyout')).toBe(false);

          httpRequestsMockHelpers.setLoadExecutionResultResponse({
            watchHistoryItem: {
              details: {},
              watchStatus: {
                actionStatuses: [],
              },
            },
          });

          await actions.clickSimulateButton();

          const actionModes = Object.keys(defaultWatch.actions).reduce(
            (actionAccum: any, action) => {
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

          expect(exists('simulateResultsFlyout')).toBe(true);
          expect(find('simulateResultsFlyoutTitle').text()).toEqual('Simulation results');
        });
      });

      describe('results flyout', () => {
        describe('correctly displays execution results', () => {
          const actionModes = ['simulate', 'force_simulate', 'execute', 'force_execute', 'skip'];
          const actionModeStatusesConditionMet = [
            'simulated',
            'simulated',
            'executed',
            'executed',
            'throttled',
          ];
          const actionModeStatusesConditionNotMet = [
            'not simulated',
            'not simulated',
            'not executed',
            'not executed',
            'throttled',
          ];
          const conditionMetStatuses = [true, false];
          const ACTION_NAME = 'my-logging-action';
          const ACTION_TYPE = 'logging';
          const ACTION_STATE = 'OK';

          actionModes.forEach((actionMode, i) => {
            conditionMetStatuses.forEach((conditionMet) => {
              describe('for ' + actionMode + ' action mode', () => {
                describe(
                  conditionMet ? 'when the condition is met' : 'when the condition is not met',
                  () => {
                    beforeEach(async () => {
                      const { actions, form } = testBed;
                      form.setInputValue('actionModesSelect', actionMode);

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
                                    status: conditionMet && actionModeStatusesConditionMet[i],
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

                      await actions.clickSimulateButton();
                    });

                    test('should set the correct condition met status', () => {
                      const { exists } = testBed;
                      expect(exists('conditionMetStatus')).toBe(conditionMet);
                      expect(exists('conditionNotMetStatus')).toBe(!conditionMet);
                    });

                    test('should set the correct values in the table', () => {
                      const { table } = testBed;
                      const { tableCellsValues } = table.getMetaData('simulateResultsTable');
                      const row = tableCellsValues[0];
                      expect(row).toEqual([
                        ACTION_NAME,
                        ACTION_TYPE,
                        actionMode,
                        ACTION_STATE,
                        '',
                        conditionMet
                          ? actionModeStatusesConditionMet[i]
                          : actionModeStatusesConditionNotMet[i],
                      ]);
                    });
                  }
                );
              });
            });
          });
        });

        describe('when API returns no results', () => {
          beforeEach(async () => {
            const { actions } = testBed;

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

            await actions.clickSimulateButton();
          });

          test('flyout renders', () => {
            const { exists } = testBed;
            expect(exists('simulateResultsFlyout')).toBe(true);
            expect(exists('simulateResultsFlyoutTitle')).toBe(true);
          });

          test('condition status is not displayed', () => {
            const { exists } = testBed;
            expect(exists('conditionMetStatus')).toBe(false);
            expect(exists('conditionNotMetStatus')).toBe(false);
          });
        });
      });
    });
  });
});
