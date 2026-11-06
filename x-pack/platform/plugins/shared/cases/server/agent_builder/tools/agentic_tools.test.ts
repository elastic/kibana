/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { createCasesClientMock, type CasesClientMock } from '../../client/mocks';
import { tasksTool } from './tasks_tool';
import { confirmedActionsTool, getConfirmationText } from './confirmed_actions_tool';
import { manageCasesTool } from './manage_cases';
import { readCaseDetail } from './search_cases';

const toolContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
  logger: loggingSystemMock.createLogger(),
  attachments: { add: jest.fn() },
  events: { sendUiEvent: jest.fn() },
  runContext: {
    runId: 'run-1',
    stack: [
      {
        type: 'agent',
        agentId: 'elastic-ai-agent',
        agentName: 'Elastic AI Agent',
        conversationId: 'room-1',
      },
    ],
  },
} as unknown as ToolHandlerContext;

const task = (extra: Record<string, unknown> = {}) =>
  ({
    id: 't-1',
    version: 'v1',
    title: 'Verify the AI verdict',
    status: 'open',
    required: true,
    assignees: [],
    parent_task_id: null,
    completed_at: null,
    workflow_id: null,
    workflow_run: null,
    ...extra,
  } as never);

const dataOf = (result: unknown) =>
  (result as { results: Array<{ data: Record<string, unknown> }> }).results[0].data;

describe('Cases agent tools for the POC features', () => {
  let client: CasesClientMock;
  let getClient: jest.Mock;

  beforeEach(() => {
    client = createCasesClientMock();
    getClient = jest.fn().mockResolvedValue(client);
  });

  it('writes as the agent, with the user request', async () => {
    client.tasks.getByCase.mockResolvedValue({ tasks: [task()] } as never);
    await tasksTool(getClient).handler({ mode: 'list', case_id: 'case-1' } as never, toolContext);
    expect(getClient).toHaveBeenCalledWith(toolContext.request, {
      actionSource: expect.objectContaining({
        type: 'agent',
        id: 'elastic-ai-agent',
        run_id: 'room-1',
      }),
    });
  });

  describe('tasks', () => {
    it('lists tasks and the required ones still open', async () => {
      client.tasks.getByCase.mockResolvedValue({
        tasks: [task(), task({ id: 't-2', title: 'Done', status: 'completed', required: true })],
      } as never);
      const data = dataOf(
        await tasksTool(getClient).handler(
          { mode: 'list', case_id: 'case-1' } as never,
          toolContext
        )
      );
      expect(data.open_count).toBe(1);
      expect(data.required_open).toEqual([{ id: 't-1', title: 'Verify the AI verdict' }]);
    });

    it('completes a task it did', async () => {
      client.tasks.get.mockResolvedValue(task());
      client.tasks.update.mockResolvedValue(task({ status: 'completed' }));
      await tasksTool(getClient).handler(
        { mode: 'complete_task', task_id: 't-1' } as never,
        toolContext
      );
      expect(client.tasks.update).toHaveBeenCalledWith('t-1', {
        version: 'v1',
        status: 'completed',
      });
    });

    it("won't complete a workflow task by hand", async () => {
      client.tasks.get.mockResolvedValue(task({ workflow_id: 'wf-1' }));
      await expect(
        tasksTool(getClient).handler(
          { mode: 'complete_task', task_id: 't-1' } as never,
          toolContext
        )
      ).rejects.toThrow('runs a workflow');
      expect(client.tasks.update).not.toHaveBeenCalled();
    });

    it("runs a task's workflow and reports the outcome", async () => {
      client.tasks.runWorkflowAndWait.mockResolvedValue(
        task({ status: 'completed', workflow_id: 'wf-1', workflow_run: { status: 'succeeded' } })
      );
      const data = dataOf(
        await tasksTool(getClient).handler(
          { mode: 'run_workflow', task_id: 't-1' } as never,
          toolContext
        )
      );
      expect(data.outcome).toBe('succeeded');
    });

    it('writes a task list from scratch', async () => {
      client.tasks.create.mockResolvedValue(task());
      await tasksTool(getClient).handler(
        {
          mode: 'create_tasks',
          case_id: 'case-1',
          tasks: [{ title: 'Isolate the host', required: true }],
        } as never,
        toolContext
      );
      expect(client.tasks.create).toHaveBeenCalledWith('case-1', {
        title: 'Isolate the host',
        required: true,
      });
    });
  });

  describe('confirmed actions', () => {
    it('always asks the user, stating the change', () => {
      const tool = confirmedActionsTool(getClient);
      expect(tool.confirmation?.askUser).toBe('always');
      expect(
        getConfirmationText({ action: 'set_visibility', case_id: 'c-1', visibility: 'restricted' })
      ).toContain('Only its assignees will be able to see it');
      expect(getConfirmationText({ action: 'sync', case_id: 'c-1' })).toContain('outside Elastic');
    });

    it('closes with the reason once confirmed', async () => {
      client.cases.get.mockResolvedValue({ id: 'c-1', version: 'v1' } as never);
      client.cases.bulkUpdate.mockResolvedValue([{ id: 'c-1', status: 'closed' }] as never);
      await confirmedActionsTool(getClient).handler(
        { action: 'close', case_id: 'c-1', close_reason: 'false_positive' } as never,
        toolContext
      );
      expect(client.cases.bulkUpdate).toHaveBeenCalledWith({
        cases: [{ id: 'c-1', version: 'v1', status: 'closed', closeReason: 'false_positive' }],
      });
    });

    it("can't act on a restricted case the user can't see", async () => {
      client.cases.get.mockRejectedValue(new Error('Saved object [cases/c-1] not found'));
      await expect(
        confirmedActionsTool(getClient).handler(
          { action: 'set_visibility', case_id: 'c-1', visibility: 'public' } as never,
          toolContext
        )
      ).rejects.toThrow('not found');
      expect(client.cases.bulkUpdate).not.toHaveBeenCalled();
    });
  });

  describe('manage', () => {
    const manage = () => manageCasesTool(getClient, false, true);

    it('refuses to close through update and points at the confirmed tool', async () => {
      await expect(
        manage().handler(
          { mode: 'update', case_id: 'c-1', updates: { status: 'closed' } } as never,
          toolContext
        )
      ).rejects.toThrow('platform.core.cases.confirmed_actions');
    });

    it('refuses to close through a closed status key in update', async () => {
      client.cases.get.mockResolvedValue({ id: 'c-1', owner: 'securitySolution' } as never);
      (client.configure.get as jest.Mock).mockResolvedValue([
        { statuses: [{ key: 'resolved', category: 'closed', order: 1 }] },
      ]);
      await expect(
        manage().handler(
          { mode: 'update', case_id: 'c-1', updates: { status_key: 'resolved' } } as never,
          toolContext
        )
      ).rejects.toThrow('confirmed_actions');
    });

    it('checks every case in update_bulk for restricted assignee changes', async () => {
      client.cases.get.mockImplementation(async ({ id }) =>
        id === 'c-2'
          ? ({ id, access: { mode: 'restricted' } } as never)
          : ({ id, access: { mode: 'default' } } as never)
      );
      await expect(
        manage().handler(
          {
            mode: 'update_bulk',
            cases: [
              { case_id: 'c-1', updates: { assignees: [] } },
              { case_id: 'c-2', updates: { assignees: [] } },
            ],
          } as never,
          toolContext
        )
      ).rejects.toThrow('change_assignees');
    });

    it('refuses turning on sync from manage', async () => {
      await expect(
        manage().handler(
          {
            mode: 'update',
            case_id: 'c-1',
            updates: { settings: { syncAlerts: false, externalSync: { autoPush: true } } },
          } as never,
          toolContext
        )
      ).rejects.toThrow('outside Elastic');
    });

    it('refuses assignee changes on a restricted case', async () => {
      client.cases.get.mockResolvedValue({ id: 'c-1', access: { mode: 'restricted' } } as never);
      await expect(
        manage().handler(
          { mode: 'assign', case_id: 'c-1', assignees: [{ uid: 'u-1' }] } as never,
          toolContext
        )
      ).rejects.toThrow('change_assignees');
    });

    it('moves to a status that pauses, but not to a closed one', async () => {
      client.cases.get.mockResolvedValue({
        id: 'c-1',
        version: 'v1',
        owner: 'securitySolution',
      } as never);
      (client.configure.get as jest.Mock).mockResolvedValue([
        {
          statuses: [
            { key: 'awaiting_analyst', category: 'open', pausesTimeTracking: true },
            { key: 'resolved', category: 'closed' },
          ],
        },
      ] as never);
      client.cases.bulkUpdate.mockResolvedValue([
        { id: 'c-1', status: 'open', status_key: 'awaiting_analyst', paused_at: 'now' },
      ] as never);

      await manage().handler(
        { mode: 'set_status', case_id: 'c-1', status_key: 'awaiting_analyst' } as never,
        toolContext
      );
      expect(client.cases.bulkUpdate).toHaveBeenCalledWith({
        cases: [{ id: 'c-1', version: 'v1', status_key: 'awaiting_analyst' }],
      });

      await expect(
        manage().handler(
          { mode: 'set_status', case_id: 'c-1', status_key: 'resolved' } as never,
          toolContext
        )
      ).rejects.toThrow('confirmation');
    });

    it('links cases', async () => {
      client.cases.linkCases.mockResolvedValue({ cases: [], inaccessible_linked_count: 0 });
      await manage().handler(
        { mode: 'link_cases', case_id: 'c-1', target_case_ids: ['c-2'] } as never,
        toolContext
      );
      expect(client.cases.linkCases).toHaveBeenCalledWith('c-1', { target_case_ids: ['c-2'] });
    });

    it('keeps main behavior with agentic cases off', async () => {
      const tool = manageCasesTool(getClient, false, false);
      expect(() => tool.schema.parse({ mode: 'link_cases' })).toThrow();
    });
  });

  it('reads the status, the pause, and the statuses a case can move to', async () => {
    client.cases.get.mockResolvedValue({
      id: 'c-1',
      owner: 'securitySolution',
      status: 'open',
      status_key: 'awaiting_analyst',
      paused_at: new Date(Date.now() - 60_000).toISOString(),
    } as never);
    (client.configure.get as jest.Mock).mockResolvedValue([
      {
        statuses: [
          {
            key: 'awaiting_analyst',
            label: 'Awaiting analyst',
            category: 'open',
            pausesTimeTracking: true,
          },
        ],
      },
    ] as never);
    const detail = await readCaseDetail('status', 'c-1', client);
    expect(detail).toEqual(
      expect.objectContaining({ status_label: 'Awaiting analyst', paused: true, category: 'open' })
    );
    expect(detail.paused_for_seconds).toBeGreaterThanOrEqual(59);
  });
});
