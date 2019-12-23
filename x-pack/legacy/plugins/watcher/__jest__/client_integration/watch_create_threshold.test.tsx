/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import axios from 'axios';
import {
  setupEnvironment,
  pageHelpers,
  nextTick,
  wrapBodyResponse,
  unwrapBodyResponse,
} from './helpers';
import { WatchCreateThresholdTestBed } from './helpers/watch_create_threshold.helpers';
import { getExecuteDetails } from '../../test/fixtures';
import { WATCH_TYPES } from '../../common/constants';

const WATCH_NAME = 'my_test_watch';

const WATCH_TIME_FIELD = '@timestamp';

const MATCH_INDICES = ['index1'];

const ES_FIELDS = [{ name: '@timestamp', type: 'date' }];

const SETTINGS = {
  action_types: {
    email: { enabled: true },
    index: { enabled: true },
    jira: { enabled: true },
    logging: { enabled: true },
    pagerduty: { enabled: true },
    slack: { enabled: true },
    webhook: { enabled: true },
  },
};

const WATCH_VISUALIZE_DATA = {
  count: [
    [1559404800000, 14],
    [1559448000000, 196],
    [1559491200000, 44],
  ],
};

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

jest.mock('../../public/np_ready/application/lib/api', () => ({
  ...jest.requireActual('../../public/np_ready/application/lib/api'),
  loadIndexPatterns: async () => {
    const INDEX_PATTERNS = [
      { attributes: { title: 'index1' } },
      { attributes: { title: 'index2' } },
      { attributes: { title: 'index3' } },
    ];
    return await INDEX_PATTERNS;
  },
  getHttpClient: () => mockHttpClient,
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
  // which does not produce a valid component wrapper
  EuiComboBox: (props: any) => (
    <input
      data-test-subj="mockComboBox"
      onChange={(syntheticEvent: any) => {
        props.onChange([syntheticEvent['0']]);
      }}
    />
  ),
}));

const { setup } = pageHelpers.watchCreateThreshold;

describe('<ThresholdWatchEdit /> create route', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchCreateThresholdTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      testBed = await setup();
      const { component } = testBed;
      await nextTick();
      component.update();
    });

    test('should set the correct page title', () => {
      const { find } = testBed;

      expect(find('pageTitle').text()).toBe('Create threshold alert');
    });

    describe('create', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadMatchingIndicesResponse({ indices: MATCH_INDICES });
        httpRequestsMockHelpers.setLoadEsFieldsResponse({ fields: ES_FIELDS });
        httpRequestsMockHelpers.setLoadSettingsResponse(SETTINGS);
        httpRequestsMockHelpers.setLoadWatchVisualizeResponse(WATCH_VISUALIZE_DATA);
      });

      describe('form validation', () => {
        test('should not allow empty name field', () => {
          const { form } = testBed;

          form.setInputValue('nameInput', '');

          expect(form.getErrorsMessages()).toContain('Name is required.');
        });

        test('should not allow empty time field', () => {
          const { form } = testBed;

          form.setInputValue('watchTimeFieldSelect', '');

          expect(form.getErrorsMessages()).toContain('A time field is required.');
        });

        test('should not allow empty interval size field', () => {
          const { form } = testBed;

          form.setInputValue('triggerIntervalSizeInput', '');

          expect(form.getErrorsMessages()).toContain('Interval size is required.');
        });

        test('should not allow negative interval size field', () => {
          const { form } = testBed;

          form.setInputValue('triggerIntervalSizeInput', '-1');

          expect(form.getErrorsMessages()).toContain('Interval size cannot be a negative number.');
        });

        test('should disable the Create button with invalid fields', () => {
          const { find } = testBed;

          expect(find('saveWatchButton').props().disabled).toEqual(true);
        });

        test('it should enable the Create button and render additional content with valid fields', async () => {
          const { form, find, component, exists } = testBed;

          form.setInputValue('nameInput', 'my_test_watch');
          find('mockComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]); // Using mocked EuiComboBox
          form.setInputValue('watchTimeFieldSelect', '@timestamp');

          await act(async () => {
            await nextTick();
            component.update();
          });

          expect(find('saveWatchButton').props().disabled).toEqual(false);

          expect(find('watchConditionTitle').text()).toBe('Match the following condition');
          expect(exists('watchVisualizationChart')).toBe(true);
          expect(exists('watchActionsPanel')).toBe(true);
        });

        // Looks like there is an issue with using 'mockComboBox'.
        describe.skip('watch conditions', () => {
          beforeEach(() => {
            const { form, find } = testBed;

            // Name, index and time fields are required before the watch condition expression renders
            form.setInputValue('nameInput', 'my_test_watch');
            act(() => {
              find('mockComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]); // Using mocked EuiComboBox
            });
            form.setInputValue('watchTimeFieldSelect', '@timestamp');
          });

          test('should require a threshold value', () => {
            const { form, find } = testBed;

            act(() => {
              find('watchThresholdButton').simulate('click');
              // Provide invalid value
              form.setInputValue('watchThresholdInput', '');
              // Provide valid value
              form.setInputValue('watchThresholdInput', '0');
            });
            expect(form.getErrorsMessages()).toContain('A value is required.');
            expect(form.getErrorsMessages().length).toEqual(0);
          });
        });
      });

      describe('actions', () => {
        beforeEach(async () => {
          const { form, find, component } = testBed;

          // Set up valid fields needed for actions component to render
          form.setInputValue('nameInput', WATCH_NAME);
          find('mockComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]); // Using mocked EuiComboBox
          form.setInputValue('watchTimeFieldSelect', WATCH_TIME_FIELD);

          await act(async () => {
            await nextTick();
            component.update();
          });
        });

        test('should simulate a logging action', async () => {
          const { form, find, actions, exists } = testBed;

          const LOGGING_MESSAGE = 'test log message';

          actions.clickAddActionButton();
          actions.clickActionLink('logging');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid field and verify
          form.setInputValue('loggingTextInput', '');

          expect(form.getErrorsMessages()).toContain('Log text is required.');
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid field and verify
          form.setInputValue('loggingTextInput', LOGGING_MESSAGE);

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).watch.id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [
              {
                id: 'logging_1',
                type: 'logging',
                text: LOGGING_MESSAGE,
                logging: {
                  text: LOGGING_MESSAGE,
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes: {
                  logging_1: 'force_execute',
                },
                ignoreCondition: true,
                recordExecution: false,
              }),
              watch: thresholdWatch,
            })
          );
        });

        test('should simulate an index action', async () => {
          const { form, find, actions, exists } = testBed;

          const INDEX = 'my_index';

          actions.clickAddActionButton();
          actions.clickActionLink('index');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid field and verify
          form.setInputValue('indexInput', '');

          expect(form.getErrorsMessages()).toContain('Index name is required.');
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid field and verify
          form.setInputValue('indexInput', INDEX);

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).watch.id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [
              {
                id: 'index_1',
                type: 'index',
                index: {
                  index: INDEX,
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes: {
                  index_1: 'force_execute',
                },
                ignoreCondition: true,
                recordExecution: false,
              }),
              watch: thresholdWatch,
            })
          );
        });

        test('should simulate a Slack action', async () => {
          const { form, actions, exists } = testBed;

          const SLACK_MESSAGE = 'test slack message';

          actions.clickAddActionButton();
          actions.clickActionLink('slack');

          expect(exists('watchActionAccordion')).toBe(true);

          form.setInputValue('slackMessageTextarea', SLACK_MESSAGE);

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).watch.id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [
              {
                id: 'slack_1',
                type: 'slack',
                text: SLACK_MESSAGE,
                slack: {
                  message: {
                    text: SLACK_MESSAGE,
                  },
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes: {
                  slack_1: 'force_execute',
                },
                ignoreCondition: true,
                recordExecution: false,
              }),
              watch: thresholdWatch,
            })
          );
        });

        test('should simulate an email action', async () => {
          const { form, find, actions, exists } = testBed;

          const EMAIL_RECIPIENT = 'test@test.com';
          const EMAIL_SUBJECT = 'test email subject';
          const EMAIL_BODY = 'this is a test email body';

          actions.clickAddActionButton();
          actions.clickActionLink('email');

          expect(exists('watchActionAccordion')).toBe(true);

          // Provide valid fields and verify
          find('watchActionAccordion.mockComboBox').simulate('change', [
            { label: EMAIL_RECIPIENT, value: EMAIL_RECIPIENT },
          ]); // Using mocked EuiComboBox
          form.setInputValue('emailSubjectInput', EMAIL_SUBJECT);
          form.setInputValue('emailBodyInput', EMAIL_BODY);

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).watch.id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [
              {
                id: 'email_1',
                type: 'email',
                to: [EMAIL_RECIPIENT],
                subject: EMAIL_SUBJECT,
                body: EMAIL_BODY,
                email: {
                  to: [EMAIL_RECIPIENT],
                  subject: EMAIL_SUBJECT,
                  body: {
                    text: EMAIL_BODY,
                  },
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes: {
                  email_1: 'force_execute',
                },
                ignoreCondition: true,
                recordExecution: false,
              }),
              watch: thresholdWatch,
            })
          );
        });

        test('should simulate a webhook action', async () => {
          const { form, find, actions, exists } = testBed;

          const METHOD = 'put';
          const HOST = 'localhost';
          const PORT = '9200';
          const SCHEME = 'http';
          const PATH = '/test';
          const USERNAME = 'test_user';
          const PASSWORD = 'test_password';

          actions.clickAddActionButton();
          actions.clickActionLink('webhook');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid fields and verify
          form.setInputValue('webhookHostInput', '');
          form.setInputValue('webhookPortInput', '');

          expect(form.getErrorsMessages()).toEqual([
            'Webhook host is required.',
            'Webhook port is required.',
          ]);
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid fields and verify
          form.setInputValue('webhookMethodSelect', METHOD);
          form.setInputValue('webhookHostInput', HOST);
          form.setInputValue('webhookPortInput', PORT);
          form.setInputValue('webhookPathInput', PATH);
          form.setInputValue('webhookUsernameInput', USERNAME);
          form.setInputValue('webhookPasswordInput', PASSWORD);

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).watch.id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [
              {
                id: 'webhook_1',
                type: 'webhook',
                method: METHOD,
                host: HOST,
                port: Number(PORT),
                scheme: SCHEME,
                path: PATH,
                body:
                  '{\n  "message": "Watch [{{ctx.metadata.name}}] has exceeded the threshold"\n}', // Default
                username: USERNAME,
                password: PASSWORD,
                webhook: {
                  host: HOST,
                  port: Number(PORT),
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes: {
                  webhook_1: 'force_execute',
                },
                ignoreCondition: true,
                recordExecution: false,
              }),
              watch: thresholdWatch,
            })
          );
        });

        test('should simulate a Jira action', async () => {
          const { form, find, actions, exists } = testBed;

          const PROJECT_KEY = 'TEST_PROJECT_KEY';
          const ISSUE_TYPE = 'Bug';
          const SUMMARY = 'test Jira summary';

          actions.clickAddActionButton();
          actions.clickActionLink('jira');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid fields and verify
          form.setInputValue('jiraProjectKeyInput', '');
          form.setInputValue('jiraIssueTypeInput', '');
          form.setInputValue('jiraSummaryInput', '');

          expect(form.getErrorsMessages()).toEqual([
            'Jira project key is required.',
            'Jira issue type is required.',
            'Jira summary is required.',
          ]);
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid fields and verify
          form.setInputValue('jiraProjectKeyInput', PROJECT_KEY);
          form.setInputValue('jiraIssueTypeInput', ISSUE_TYPE);
          form.setInputValue('jiraSummaryInput', SUMMARY);

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).watch.id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [
              {
                id: 'jira_1',
                type: 'jira',
                projectKey: PROJECT_KEY,
                issueType: ISSUE_TYPE,
                summary: SUMMARY,
                jira: {
                  fields: {
                    project: {
                      key: PROJECT_KEY,
                    },
                    issuetype: {
                      name: ISSUE_TYPE,
                    },
                    summary: SUMMARY,
                  },
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes: {
                  jira_1: 'force_execute',
                },
                ignoreCondition: true,
                recordExecution: false,
              }),
              watch: thresholdWatch,
            })
          );
        });

        test('should simulate a PagerDuty action', async () => {
          const { form, actions, exists, find } = testBed;

          const DESCRIPTION = 'test pagerduty description';

          actions.clickAddActionButton();
          actions.clickActionLink('pagerduty');

          expect(exists('watchActionAccordion')).toBe(true);

          // First, provide invalid fields and verify
          form.setInputValue('pagerdutyDescriptionInput', '');

          expect(form.getErrorsMessages()).toContain('PagerDuty description is required.');
          expect(find('simulateActionButton').props().disabled).toEqual(true);

          // Next, provide valid fields and verify
          form.setInputValue('pagerdutyDescriptionInput', DESCRIPTION);

          await act(async () => {
            actions.clickSimulateButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).watch.id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [
              {
                id: 'pagerduty_1',
                type: 'pagerduty',
                description: DESCRIPTION,
                pagerduty: {
                  description: DESCRIPTION,
                },
              },
            ],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(
            wrapBodyResponse({
              executeDetails: getExecuteDetails({
                actionModes: {
                  pagerduty_1: 'force_execute',
                },
                ignoreCondition: true,
                recordExecution: false,
              }),
              watch: thresholdWatch,
            })
          );
        });
      });

      describe('form payload', () => {
        test('should send the correct payload', async () => {
          const { form, find, component, actions } = testBed;

          // Set up required fields
          form.setInputValue('nameInput', WATCH_NAME);
          find('mockComboBox').simulate('change', [{ label: 'index1', value: 'index1' }]); // Using mocked EuiComboBox
          form.setInputValue('watchTimeFieldSelect', WATCH_TIME_FIELD);

          await act(async () => {
            await nextTick();
            component.update();
            actions.clickSubmitButton();
            await nextTick();
          });

          // Verify request
          const latestRequest = server.requests[server.requests.length - 1];

          const thresholdWatch = {
            id: unwrapBodyResponse(latestRequest.requestBody).id, // watch ID is created dynamically
            name: WATCH_NAME,
            type: WATCH_TYPES.THRESHOLD,
            isNew: true,
            actions: [],
            index: MATCH_INDICES,
            timeField: WATCH_TIME_FIELD,
            triggerIntervalSize: 1,
            triggerIntervalUnit: 'm',
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: 1000,
          };

          expect(latestRequest.requestBody).toEqual(wrapBodyResponse(thresholdWatch));
        });
      });
    });
  });
});
