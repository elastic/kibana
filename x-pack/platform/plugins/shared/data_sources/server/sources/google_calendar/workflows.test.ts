/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import {
  getWorkflowYaml,
  loadWorkflowsThroughProductionPath,
  registerExtensionSteps,
  type ProcessedWorkflow,
} from '../workflow.test_helpers';
import { googleCalendarDataSource } from './data_type';

const CONNECTOR_NAME = 'fake-google-calendar-connector';
const CONNECTOR_ID = 'fake-gcal-connector-uuid';

describe('google calendar workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(googleCalendarDataSource, {
      stackConnectorId: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.google_calendar' },
    ]);

    registerExtensionSteps(fixture);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
      params,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      const subAction = params.subAction as string;

      switch (subAction) {
        case 'searchEvents':
          return {
            status: 'ok',
            actionId,
            data: {
              items: [
                {
                  id: 'evt-1',
                  summary: 'Team Standup',
                  start: { dateTime: '2024-01-15T10:00:00Z' },
                  end: { dateTime: '2024-01-15T10:30:00Z' },
                  status: 'confirmed',
                  htmlLink: 'https://calendar.google.com/event?eid=evt-1',
                  organizer: { email: 'org@example.com' },
                  attendees: [
                    { email: 'a@example.com', displayName: 'Alice', responseStatus: 'accepted' },
                  ],
                  created: '2024-01-01T00:00:00Z',
                  updated: '2024-01-10T00:00:00Z',
                },
              ],
              nextPageToken: null,
            },
          };
        case 'listEvents':
          return {
            status: 'ok',
            actionId,
            data: {
              items: [
                { id: 'evt-2', summary: 'Lunch', start: { dateTime: '2024-01-15T12:00:00Z' } },
              ],
              nextPageToken: null,
            },
          };
        case 'listCalendars':
          return {
            status: 'ok',
            actionId,
            data: {
              items: [
                {
                  id: 'primary',
                  summary: 'My Calendar',
                  primary: true,
                  accessRole: 'owner',
                  timeZone: 'UTC',
                },
              ],
              nextPageToken: null,
            },
          };
        case 'getEvent':
          return {
            status: 'ok',
            actionId,
            data: {
              id: 'evt-1',
              summary: 'Team Standup',
              description: 'Daily sync',
              start: { dateTime: '2024-01-15T10:00:00Z' },
              end: { dateTime: '2024-01-15T10:30:00Z' },
              status: 'confirmed',
              htmlLink: 'https://calendar.google.com/event?eid=evt-1',
              organizer: { email: 'org@example.com' },
              creator: { email: 'org@example.com' },
              attendees: [
                { email: 'a@example.com', displayName: 'Alice', responseStatus: 'accepted' },
              ],
              created: '2024-01-01T00:00:00Z',
              updated: '2024-01-10T00:00:00Z',
            },
          };
        case 'freeBusy':
          return {
            status: 'ok',
            actionId,
            data: {
              timeMin: '2024-01-15T09:00:00Z',
              timeMax: '2024-01-15T18:00:00Z',
              calendars: {
                primary: { busy: [{ start: '2024-01-15T10:00:00Z', end: '2024-01-15T10:30:00Z' }] },
              },
            },
          };
        default:
          throw new Error(`Unexpected Google Calendar subAction: ${subAction}`);
      }
    };
  });

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('all workflows pass production validation without liquid template errors', () => {
    for (const wf of workflows) {
      expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
        workflow: wf.name,
        liquidErrors: [],
      });
    }
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'team meeting', maxResults: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchEvents',
            subActionParams: {
              query: 'team meeting',
              calendarId: 'primary',
              timeMin: undefined,
              timeMax: undefined,
              maxResults: 10,
              orderBy: undefined,
            },
          }),
        })
      );
    });
  });

  describe('list_events workflow', () => {
    it('forwards list parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_events'),
        inputs: { timeMin: '2024-01-01T00:00:00Z', timeMax: '2024-01-31T23:59:59Z' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listEvents',
            subActionParams: {
              calendarId: 'primary',
              timeMin: '2024-01-01T00:00:00Z',
              timeMax: '2024-01-31T23:59:59Z',
              maxResults: undefined,
              pageToken: undefined,
              orderBy: undefined,
            },
          }),
        })
      );
    });
  });

  describe('list_calendars workflow', () => {
    it('lists calendars with no parameters', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_calendars'),
        inputs: {},
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listCalendars',
            subActionParams: {
              pageToken: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_event workflow', () => {
    it('forwards event ID to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_event'),
        inputs: { eventId: 'evt-abc-123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getEvent',
            subActionParams: {
              eventId: 'evt-abc-123',
              calendarId: 'primary',
            },
          }),
        })
      );
    });
  });

  describe('free_busy workflow', () => {
    it('forwards free/busy parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'free_busy'),
        inputs: {
          timeMin: '2024-01-15T09:00:00Z',
          timeMax: '2024-01-15T18:00:00Z',
          calendarIds: ['primary', 'colleague@example.com'],
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'freeBusy',
            subActionParams: {
              timeMin: '2024-01-15T09:00:00Z',
              timeMax: '2024-01-15T18:00:00Z',
              calendarIds: ['primary', 'colleague@example.com'],
              timeZone: undefined,
            },
          }),
        })
      );
    });
  });
});
