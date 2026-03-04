/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import '@kbn/code-editor-mock/jest_helper';

import { getExecuteDetails } from '../../__fixtures__';
import { ACTION_TYPES, API_BASE_PATH, WATCH_TYPES } from '../../common/constants';
import { WATCH_ID } from './helpers/jest_constants';
import type { HttpSetup } from '@kbn/core/public';
import { WatchEditPage } from '../../public/application/sections/watch_edit_page/watch_edit_page';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';
import { registerRouter } from '../../public/application/lib/navigation';

const WATCH_NAME = 'my_test_watch';
const WATCH_TIME_FIELD = '@timestamp';

const MATCH_INDICES = ['index1'];
const ES_FIELDS = [{ name: '@timestamp', type: 'date', normalizedType: 'date' }];

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
  visualizeData: {
    count: [
      [1559404800000, 14],
      [1559448000000, 196],
      [1559491200000, 44],
    ],
  },
};

// Since watchID's are dynamically created, we have to mock the function that generates them.
jest.mock('uuid', () => ({
  v4: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./helpers/jest_constants').WATCH_ID;
  },
  v1: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./helpers/jest_constants').WATCH_ID;
  },
}));

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;
  const isArrayLikeWithZero = (v: unknown): v is { 0: unknown } => isRecord(v) && '0' in v;

  return {
    ...original,
    // Mocking EuiComboBox: ThresholdWatchEdit uses it for selecting indices.
    // Support both legacy Enzyme simulate() (array-like) and RTL fireEvent.change (event.target.value).
    EuiComboBox: (props: {
      selectedOptions: Array<{ value?: string; label?: string }>;
      onChange: (options: Array<{ label: string; value: string }>) => void;
      'data-test-subj'?: string;
    }) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        value={props.selectedOptions[0]?.value ?? ''}
        onChange={(evt: unknown) => {
          // Enzyme simulate() path (legacy)
          if (isArrayLikeWithZero(evt)) {
            const first = (evt as { 0: unknown })[0];
            if (
              isRecord(first) &&
              typeof first.label === 'string' &&
              typeof first.value === 'string'
            ) {
              props.onChange([{ label: first.label, value: first.value }]);
            }
            return;
          }

          // RTL path
          if (isRecord(evt) && isRecord(evt.target) && typeof evt.target.value === 'string') {
            const value = evt.target.value;
            props.onChange([{ label: value, value }]);
          }
        }}
      />
    ),
  };
});

const renderCreateThresholdWatch = (httpSetup: HttpSetup) => {
  const Wrapped = WithAppDependencies(WatchEditPage, httpSetup);
  render(
    <I18nProvider>
      <Wrapped match={{ params: { id: undefined, type: WATCH_TYPES.THRESHOLD } }} />
    </I18nProvider>
  );
};

describe('<ThresholdWatchEditPage /> create route', () => {
  let httpSetup: HttpSetup;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let routerHistoryPush: jest.Mock;

  const fillRequiredThresholdFields = async () => {
    fireEvent.change(screen.getByTestId('nameInput'), { target: { value: WATCH_NAME } });
    fireEvent.change(screen.getByTestId('indicesComboBox'), {
      target: { value: MATCH_INDICES[0] },
    });

    await waitFor(() => {
      expect(
        within(screen.getByTestId('watchTimeFieldSelect')).getByRole('option', {
          name: '@timestamp',
        })
      ).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('watchTimeFieldSelect'), {
      target: { value: WATCH_TIME_FIELD },
    });

    await screen.findByTestId('watchActionsPanel');
  };

  const addAction = async (actionType: string) => {
    fireEvent.click(screen.getByTestId('addWatchActionButton'));
    const actionButton = await screen.findByTestId(`${actionType}ActionButton`);
    fireEvent.click(actionButton);

    const accordions = await screen.findAllByTestId('watchActionAccordion');
    expect(accordions).toHaveLength(1);
    return accordions[0];
  };

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

  const parseJsonBody = (request: Record<string, unknown>) => {
    const body = request.body;
    expect(typeof body).toBe('string');
    return JSON.parse(body as string) as Record<string, unknown>;
  };

  const getLastCallForUrl = (
    calls: Array<[unknown, unknown?]>,
    url: string
  ): [string, Record<string, unknown>] => {
    const matching = calls.filter(([callUrl]) => callUrl === url);
    expect(matching.length).toBeGreaterThan(0);

    const last = matching[matching.length - 1];
    return [last[0] as string, (last[1] as Record<string, unknown>) ?? {}];
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
    routerHistoryPush = jest.fn();
    registerRouter({ history: { push: routerHistoryPush } });

    httpRequestsMockHelpers.setLoadIndexPatternsResponse([]);
    httpRequestsMockHelpers.setLoadMatchingIndicesResponse({ indices: MATCH_INDICES });
    httpRequestsMockHelpers.setLoadEsFieldsResponse({ fields: ES_FIELDS });
    httpRequestsMockHelpers.setLoadSettingsResponse(SETTINGS);
    httpRequestsMockHelpers.setLoadWatchVisualizeResponse(WATCH_VISUALIZE_DATA);

    renderCreateThresholdWatch(httpSetup);
    await screen.findByTestId('thresholdWatchForm');
  });

  test('should set the correct page title', () => {
    expect(screen.getByTestId('pageTitle')).toHaveTextContent('Create threshold alert');
  });

  describe('form validation', () => {
    test('should not allow empty name field', async () => {
      fireEvent.change(screen.getByTestId('nameInput'), { target: { value: '' } });
      fireEvent.blur(screen.getByTestId('nameInput'));

      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    });

    test('should not allow empty time field', async () => {
      fireEvent.change(screen.getByTestId('watchTimeFieldSelect'), { target: { value: '' } });
      fireEvent.blur(screen.getByTestId('watchTimeFieldSelect'));

      expect(await screen.findByText('A time field is required.')).toBeInTheDocument();
    });

    test('should not allow empty interval size field', async () => {
      fireEvent.change(screen.getByTestId('triggerIntervalSizeInput'), { target: { value: '' } });
      fireEvent.blur(screen.getByTestId('triggerIntervalSizeInput'));

      expect(await screen.findByText('Interval size is required.')).toBeInTheDocument();
    });

    test('should not allow negative interval size field', async () => {
      fireEvent.change(screen.getByTestId('triggerIntervalSizeInput'), { target: { value: '-1' } });
      fireEvent.blur(screen.getByTestId('triggerIntervalSizeInput'));

      expect(
        await screen.findByText('Interval size cannot be a negative number.')
      ).toBeInTheDocument();
    });

    test('should disable the Create button with invalid fields', () => {
      expect(screen.getByTestId('saveWatchButton')).toBeDisabled();
    });

    test('it should enable the Create button and render additional content with valid fields', async () => {
      fireEvent.change(screen.getByTestId('nameInput'), { target: { value: WATCH_NAME } });
      fireEvent.change(screen.getByTestId('indicesComboBox'), {
        target: { value: MATCH_INDICES[0] },
      });

      // Time field options are populated from fetched fields; wait for the option to exist.
      await waitFor(() => {
        expect(
          within(screen.getByTestId('watchTimeFieldSelect')).getByRole('option', {
            name: '@timestamp',
          })
        ).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('watchTimeFieldSelect'), {
        target: { value: WATCH_TIME_FIELD },
      });

      await waitFor(() => {
        expect(screen.getByTestId('saveWatchButton')).not.toBeDisabled();
      });

      expect(screen.getByTestId('watchConditionTitle')).toHaveTextContent(
        'Match the following condition'
      );
      expect(await screen.findByTestId('watchVisualizationChart')).toBeInTheDocument();
      expect(screen.getByTestId('watchActionsPanel')).toBeInTheDocument();
    });
  });

  describe('watch conditions', () => {
    beforeEach(async () => {
      fireEvent.change(screen.getByTestId('nameInput'), { target: { value: WATCH_NAME } });
      fireEvent.change(screen.getByTestId('indicesComboBox'), {
        target: { value: MATCH_INDICES[0] },
      });

      await waitFor(() => {
        expect(
          within(screen.getByTestId('watchTimeFieldSelect')).getByRole('option', {
            name: '@timestamp',
          })
        ).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('watchTimeFieldSelect'), {
        target: { value: WATCH_TIME_FIELD },
      });

      await waitFor(() => {
        expect(screen.getByTestId('saveWatchButton')).not.toBeDisabled();
      });
    });

    test('should require a threshold value', async () => {
      const user = userEvent.setup();

      // Open the threshold popover and validate threshold input
      await user.click(screen.getByTestId('watchThresholdButton'));
      expect(screen.getByTestId('watchThresholdInput')).toBeInTheDocument();

      fireEvent.change(screen.getByTestId('watchThresholdInput'), { target: { value: '' } });

      // Debounced validation: wait on the UI boundary
      expect(await screen.findByText('A value is required.')).toBeInTheDocument();

      // Provide valid value; validation errors clear on change
      fireEvent.change(screen.getByTestId('watchThresholdInput'), { target: { value: '0' } });
      await waitFor(() => {
        expect(screen.queryByText('A value is required.')).not.toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    beforeEach(async () => {
      await fillRequiredThresholdFields();
    });

    const setSuccessfulExecuteResponseForAction = (actionId: string) => {
      httpRequestsMockHelpers.setLoadExecutionResultResponse({
        watchHistoryItem: {
          watchStatus: {
            actionStatuses: [{ id: actionId, state: 'OK' }],
          },
        },
      });
    };

    test('should simulate a logging action', async () => {
      const LOGGING_MESSAGE = 'test log message';
      const actionId = `${ACTION_TYPES.LOGGING}_1`;

      const accordion = await addAction(ACTION_TYPES.LOGGING);
      const loggingInput = within(accordion).getByTestId('loggingTextInput');
      const simulateButton = within(accordion).getByTestId('simulateActionButton');

      // First, provide invalid field and verify
      fireEvent.change(loggingInput, { target: { value: '' } });
      fireEvent.blur(loggingInput);

      expect(await screen.findByText('Log text is required.')).toBeInTheDocument();
      expect(simulateButton).toBeDisabled();

      // Next, provide valid field and verify
      fireEvent.change(loggingInput, { target: { value: LOGGING_MESSAGE } });

      await waitFor(() => {
        expect(screen.queryByText('Log text is required.')).not.toBeInTheDocument();
      });

      setSuccessfulExecuteResponseForAction(actionId);
      fireEvent.click(simulateButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenCalledWith(
          `${API_BASE_PATH}/watch/execute`,
          expect.anything()
        );
      });

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.put).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/execute`
      );
      const payload = parseJsonBody(request);

      expect(payload.executeDetails).toEqual(
        getExecuteDetails({
          actionModes: { [actionId]: 'force_execute' },
          ignoreCondition: true,
          recordExecution: false,
        })
      );
      expect(isRecord(payload.watch)).toBe(true);
      expect((payload.watch as Record<string, unknown>).actions).toEqual([
        expect.objectContaining({
          id: actionId,
          type: ACTION_TYPES.LOGGING,
          text: LOGGING_MESSAGE,
          logging: { text: LOGGING_MESSAGE },
        }),
      ]);
    });

    test('should simulate an index action', async () => {
      const actionId = `${ACTION_TYPES.INDEX}_1`;

      const accordion = await addAction(ACTION_TYPES.INDEX);
      const indexInput = within(accordion).getByTestId('indexInput');
      const simulateButton = within(accordion).getByTestId('simulateActionButton');

      // Verify an empty index is allowed
      fireEvent.change(indexInput, { target: { value: '' } });
      fireEvent.blur(indexInput);

      setSuccessfulExecuteResponseForAction(actionId);
      fireEvent.click(simulateButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenCalledWith(
          `${API_BASE_PATH}/watch/execute`,
          expect.anything()
        );
      });

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.put).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/execute`
      );
      const payload = parseJsonBody(request);

      expect(payload.executeDetails).toEqual(
        getExecuteDetails({
          actionModes: { [actionId]: 'force_execute' },
          ignoreCondition: true,
          recordExecution: false,
        })
      );
      expect(isRecord(payload.watch)).toBe(true);
      expect((payload.watch as Record<string, unknown>).actions).toEqual([
        expect.objectContaining({
          id: actionId,
          type: ACTION_TYPES.INDEX,
          index: { index: '' },
        }),
      ]);
    });

    test('should simulate a Slack action', async () => {
      const SLACK_MESSAGE = 'test slack message';
      const actionId = `${ACTION_TYPES.SLACK}_1`;

      const accordion = await addAction(ACTION_TYPES.SLACK);
      const slackMessage = within(accordion).getByTestId('slackMessageTextarea');
      const simulateButton = within(accordion).getByTestId('simulateActionButton');

      fireEvent.change(slackMessage, { target: { value: SLACK_MESSAGE } });

      setSuccessfulExecuteResponseForAction(actionId);
      fireEvent.click(simulateButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenCalledWith(
          `${API_BASE_PATH}/watch/execute`,
          expect.anything()
        );
      });

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.put).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/execute`
      );
      const payload = parseJsonBody(request);

      expect(payload.executeDetails).toEqual(
        getExecuteDetails({
          actionModes: { [actionId]: 'force_execute' },
          ignoreCondition: true,
          recordExecution: false,
        })
      );
      expect(isRecord(payload.watch)).toBe(true);
      expect((payload.watch as Record<string, unknown>).actions).toEqual([
        expect.objectContaining({
          id: actionId,
          type: ACTION_TYPES.SLACK,
          text: SLACK_MESSAGE,
          slack: { message: { text: SLACK_MESSAGE } },
        }),
      ]);
    });

    test('should simulate an email action', async () => {
      const EMAIL_RECIPIENT = 'test@test.com';
      const EMAIL_SUBJECT = 'test email subject';
      const EMAIL_BODY = 'this is a test email body';
      const actionId = `${ACTION_TYPES.EMAIL}_1`;

      const accordion = await addAction(ACTION_TYPES.EMAIL);
      const toEmailInput = within(accordion).getByTestId('toEmailAddressInput');
      const subjectInput = within(accordion).getByTestId('emailSubjectInput');
      const bodyInput = within(accordion).getByTestId('emailBodyInput');
      const simulateButton = within(accordion).getByTestId('simulateActionButton');

      fireEvent.change(toEmailInput, { target: { value: EMAIL_RECIPIENT } });
      fireEvent.change(subjectInput, { target: { value: EMAIL_SUBJECT } });
      fireEvent.change(bodyInput, { target: { value: EMAIL_BODY } });

      setSuccessfulExecuteResponseForAction(actionId);
      fireEvent.click(simulateButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenCalledWith(
          `${API_BASE_PATH}/watch/execute`,
          expect.anything()
        );
      });

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.put).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/execute`
      );
      const payload = parseJsonBody(request);

      expect(payload.executeDetails).toEqual(
        getExecuteDetails({
          actionModes: { [actionId]: 'force_execute' },
          ignoreCondition: true,
          recordExecution: false,
        })
      );
      expect(isRecord(payload.watch)).toBe(true);
      expect((payload.watch as Record<string, unknown>).actions).toEqual([
        expect.objectContaining({
          id: actionId,
          type: ACTION_TYPES.EMAIL,
          to: [EMAIL_RECIPIENT],
          subject: EMAIL_SUBJECT,
          body: EMAIL_BODY,
          email: {
            to: [EMAIL_RECIPIENT],
            subject: EMAIL_SUBJECT,
            body: { text: EMAIL_BODY },
          },
        }),
      ]);
    });

    test('should simulate a webhook action', async () => {
      const METHOD = 'put';
      const HOST = 'localhost';
      const PORT = '9200';
      const SCHEME = 'http';
      const PATH = '/test';
      const USERNAME = 'test_user';
      const PASSWORD = 'test_password';
      const actionId = `${ACTION_TYPES.WEBHOOK}_1`;

      const accordion = await addAction(ACTION_TYPES.WEBHOOK);
      const simulateButton = within(accordion).getByTestId('simulateActionButton');

      const hostInput = within(accordion).getByTestId('webhookHostInput');
      const portInput = within(accordion).getByTestId('webhookPortInput');

      // First, provide invalid fields and verify
      fireEvent.change(hostInput, { target: { value: '' } });
      fireEvent.blur(hostInput);
      fireEvent.change(portInput, { target: { value: '' } });
      fireEvent.blur(portInput);

      expect(await screen.findByText('Webhook host is required.')).toBeInTheDocument();
      expect(await screen.findByText('Webhook port is required.')).toBeInTheDocument();
      expect(simulateButton).toBeDisabled();

      // Next, provide valid fields and verify
      fireEvent.change(within(accordion).getByTestId('webhookMethodSelect'), {
        target: { value: METHOD },
      });
      fireEvent.change(hostInput, { target: { value: HOST } });
      fireEvent.change(portInput, { target: { value: PORT } });
      fireEvent.change(within(accordion).getByTestId('webhookSchemeSelect'), {
        target: { value: SCHEME },
      });
      fireEvent.change(within(accordion).getByTestId('webhookPathInput'), {
        target: { value: PATH },
      });
      fireEvent.change(within(accordion).getByTestId('webhookUsernameInput'), {
        target: { value: USERNAME },
      });
      fireEvent.change(within(accordion).getByTestId('webhookPasswordInput'), {
        target: { value: PASSWORD },
      });

      await waitFor(() => {
        expect(simulateButton).not.toBeDisabled();
      });

      setSuccessfulExecuteResponseForAction(actionId);
      fireEvent.click(simulateButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenCalledWith(
          `${API_BASE_PATH}/watch/execute`,
          expect.anything()
        );
      });

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.put).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/execute`
      );
      const payload = parseJsonBody(request);

      expect(payload.executeDetails).toEqual(
        getExecuteDetails({
          actionModes: { [actionId]: 'force_execute' },
          ignoreCondition: true,
          recordExecution: false,
        })
      );
      expect(isRecord(payload.watch)).toBe(true);
      expect((payload.watch as Record<string, unknown>).actions).toEqual([
        expect.objectContaining({
          id: actionId,
          type: ACTION_TYPES.WEBHOOK,
          method: METHOD,
          host: HOST,
          port: Number(PORT),
          scheme: SCHEME,
          path: PATH,
          username: USERNAME,
          password: PASSWORD,
          webhook: { host: HOST, port: Number(PORT) },
        }),
      ]);
    });

    test('should simulate a Jira action', async () => {
      const PROJECT_KEY = 'TEST_PROJECT_KEY';
      const ISSUE_TYPE = 'Bug';
      const SUMMARY = 'test Jira summary';
      const actionId = `${ACTION_TYPES.JIRA}_1`;

      const accordion = await addAction(ACTION_TYPES.JIRA);
      const simulateButton = within(accordion).getByTestId('simulateActionButton');

      const issueTypeInput = within(accordion).getByTestId('jiraIssueTypeInput');
      const projectKeyInput = within(accordion).getByTestId('jiraProjectKeyInput');
      const summaryInput = within(accordion).getByTestId('jiraSummaryInput');

      // Clear fields to trigger required error messages
      fireEvent.change(issueTypeInput, { target: { value: 'myissue' } });
      fireEvent.change(issueTypeInput, { target: { value: '' } });
      fireEvent.blur(issueTypeInput);

      fireEvent.change(projectKeyInput, { target: { value: 'my key' } });
      fireEvent.change(projectKeyInput, { target: { value: '' } });
      fireEvent.blur(projectKeyInput);

      fireEvent.change(summaryInput, { target: { value: '' } });
      fireEvent.blur(summaryInput);

      expect(await screen.findByText('Jira project key is required.')).toBeInTheDocument();
      expect(await screen.findByText('Jira issue type is required.')).toBeInTheDocument();
      expect(await screen.findByText('Jira summary is required.')).toBeInTheDocument();
      expect(simulateButton).toBeDisabled();

      // Next, provide valid fields and verify
      fireEvent.change(projectKeyInput, { target: { value: PROJECT_KEY } });
      fireEvent.change(issueTypeInput, { target: { value: ISSUE_TYPE } });
      fireEvent.change(summaryInput, { target: { value: SUMMARY } });

      await waitFor(() => {
        expect(simulateButton).not.toBeDisabled();
      });

      setSuccessfulExecuteResponseForAction(actionId);
      fireEvent.click(simulateButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenCalledWith(
          `${API_BASE_PATH}/watch/execute`,
          expect.anything()
        );
      });

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.put).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/execute`
      );
      const payload = parseJsonBody(request);

      expect(payload.executeDetails).toEqual(
        getExecuteDetails({
          actionModes: { [actionId]: 'force_execute' },
          ignoreCondition: true,
          recordExecution: false,
        })
      );
      expect(isRecord(payload.watch)).toBe(true);
      expect((payload.watch as Record<string, unknown>).actions).toEqual([
        expect.objectContaining({
          id: actionId,
          type: ACTION_TYPES.JIRA,
          projectKey: PROJECT_KEY,
          issueType: ISSUE_TYPE,
          summary: SUMMARY,
          jira: {
            fields: {
              project: { key: PROJECT_KEY },
              issuetype: { name: ISSUE_TYPE },
              summary: SUMMARY,
            },
          },
        }),
      ]);
    });

    test('should simulate a PagerDuty action', async () => {
      const DESCRIPTION = 'test pagerduty description';
      const actionId = `${ACTION_TYPES.PAGERDUTY}_1`;

      const accordion = await addAction(ACTION_TYPES.PAGERDUTY);
      const simulateButton = within(accordion).getByTestId('simulateActionButton');
      const descriptionInput = within(accordion).getByTestId('pagerdutyDescriptionInput');

      // First, provide invalid fields and verify
      fireEvent.change(descriptionInput, { target: { value: '' } });
      fireEvent.blur(descriptionInput);

      expect(await screen.findByText('PagerDuty description is required.')).toBeInTheDocument();
      expect(simulateButton).toBeDisabled();

      // Next, provide valid fields and verify
      fireEvent.change(descriptionInput, { target: { value: DESCRIPTION } });
      await waitFor(() => {
        expect(simulateButton).not.toBeDisabled();
      });

      setSuccessfulExecuteResponseForAction(actionId);
      fireEvent.click(simulateButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenCalledWith(
          `${API_BASE_PATH}/watch/execute`,
          expect.anything()
        );
      });

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.put).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/execute`
      );
      const payload = parseJsonBody(request);

      expect(payload.executeDetails).toEqual(
        getExecuteDetails({
          actionModes: { [actionId]: 'force_execute' },
          ignoreCondition: true,
          recordExecution: false,
        })
      );
      expect(isRecord(payload.watch)).toBe(true);
      expect((payload.watch as Record<string, unknown>).actions).toEqual([
        expect.objectContaining({
          id: actionId,
          type: ACTION_TYPES.PAGERDUTY,
          description: DESCRIPTION,
          pagerduty: { description: DESCRIPTION },
        }),
      ]);
    });
  });

  describe('watch visualize data payload', () => {
    test('should send the correct payload', async () => {
      await fillRequiredThresholdFields();

      await screen.findByTestId('watchVisualizationChart');

      const [, request] = getLastCallForUrl(
        jest.mocked(httpSetup.post).mock.calls as Array<[unknown, unknown?]>,
        `${API_BASE_PATH}/watch/visualize`
      );
      const payload = parseJsonBody(request);

      expect(payload.watch).toEqual({
        id: WATCH_ID,
        name: WATCH_NAME,
        type: WATCH_TYPES.THRESHOLD,
        isNew: true,
        isActive: true,
        actions: [],
        index: MATCH_INDICES,
        timeField: WATCH_TIME_FIELD,
        triggerIntervalSize: 1,
        triggerIntervalUnit: 'm',
        aggType: 'count',
        termSize: 5,
        termOrder: 'desc',
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        hasTermsAgg: false,
        threshold: 1000,
      });
    });
  });

  describe('form payload', () => {
    test('should send the correct payload', async () => {
      const user = userEvent.setup();

      fireEvent.change(screen.getByTestId('nameInput'), { target: { value: WATCH_NAME } });
      fireEvent.change(screen.getByTestId('indicesComboBox'), {
        target: { value: MATCH_INDICES[0] },
      });
      await waitFor(() => {
        expect(
          within(screen.getByTestId('watchTimeFieldSelect')).getByRole('option', {
            name: '@timestamp',
          })
        ).toBeInTheDocument();
      });
      fireEvent.change(screen.getByTestId('watchTimeFieldSelect'), {
        target: { value: WATCH_TIME_FIELD },
      });

      await waitFor(() => {
        expect(screen.getByTestId('saveWatchButton')).not.toBeDisabled();
      });

      await user.click(screen.getByTestId('saveWatchButton'));

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/watch/${WATCH_ID}`,
          expect.objectContaining({
            body: JSON.stringify({
              id: WATCH_ID,
              name: WATCH_NAME,
              type: WATCH_TYPES.THRESHOLD,
              isNew: true,
              isActive: true,
              actions: [],
              index: MATCH_INDICES,
              timeField: WATCH_TIME_FIELD,
              triggerIntervalSize: 1,
              triggerIntervalUnit: 'm',
              aggType: 'count',
              termSize: 5,
              termOrder: 'desc',
              thresholdComparator: '>',
              timeWindowSize: 5,
              timeWindowUnit: 'm',
              hasTermsAgg: false,
              threshold: 1000,
            }),
          })
        );
      });

      expect(routerHistoryPush).toHaveBeenCalledWith({ pathname: '/watches' });
    });
  });
});
