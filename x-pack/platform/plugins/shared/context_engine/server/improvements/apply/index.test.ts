/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { ImprovementAction } from '../../../common/http_api/improvement_actions';
import type { Improvement } from '../../../common/http_api/improvements';
import type { AiIndexService } from '../../ai_indices/service';
import type { WorkflowProvider } from '../../workflows/provider';
import { applyImprovement } from '.';
import { addKi, editKi, removeKi } from './ki';
import { addSource, editSource, removeSource } from './source';
import { addWorkflow, editWorkflow, removeWorkflow } from './workflow';

jest.mock('./ki');
jest.mock('./source');
jest.mock('./workflow');

const addKiMock = addKi as jest.MockedFunction<typeof addKi>;
const editKiMock = editKi as jest.MockedFunction<typeof editKi>;
const removeKiMock = removeKi as jest.MockedFunction<typeof removeKi>;
const addSourceMock = addSource as jest.MockedFunction<typeof addSource>;
const editSourceMock = editSource as jest.MockedFunction<typeof editSource>;
const removeSourceMock = removeSource as jest.MockedFunction<typeof removeSource>;
const addWorkflowMock = addWorkflow as jest.MockedFunction<typeof addWorkflow>;
const editWorkflowMock = editWorkflow as jest.MockedFunction<typeof editWorkflow>;
const removeWorkflowMock = removeWorkflow as jest.MockedFunction<typeof removeWorkflow>;

const dest = { type: 'data_stream' as const, value: 'ai-index-ds-support' };
const request = httpServerMock.createKibanaRequest();
const actions = {} as ActionsPluginStart;

const createDeps = (workflows?: WorkflowProvider) => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  aiIndexService: {
    get: jest.fn().mockResolvedValue({ id: 'support', dest }),
  } as unknown as jest.Mocked<AiIndexService>,
  workflows,
  actions,
  spaceId: 'default',
  request,
  logger: loggingSystemMock.createLogger(),
});

const createWorkflows = (): jest.Mocked<WorkflowProvider> => ({
  validate: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  setEnabled: jest.fn(),
  delete: jest.fn(),
});

const improvement = (
  action: ImprovementAction,
  overrides: Partial<Improvement> = {}
): Improvement => ({
  improvement_id: 'imp-1',
  revision_id: 'rev-1',
  latest: true,
  ai_index_id: 'support',
  '@timestamp': '2026-08-20T09:00:00.000Z',
  status: 'suggested',
  suggested_at: '2026-08-20T09:00:00.000Z',
  action,
  title: 'Clarify the refund window',
  rationale: 'Three unanswered questions mentioned refunds.',
  payload: {},
  provenance: {
    agent_run_id: 'run-1',
    signal_ids: ['sig-1'],
    signal_spaces: ['default'],
    signal_window: { from: 'now-30d', to: 'now' },
    signal_count: 3,
  },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  addKiMock.mockResolvedValue('ki-new');
  editKiMock.mockResolvedValue('ki-1');
  removeKiMock.mockResolvedValue('ki-1');
  addSourceMock.mockResolvedValue('logs-*');
  editSourceMock.mockResolvedValue('logs-2026-*');
  removeSourceMock.mockResolvedValue('logs-*');
  addWorkflowMock.mockResolvedValue('wf-new');
  editWorkflowMock.mockResolvedValue('wf-1');
  removeWorkflowMock.mockResolvedValue('wf-1');
});

describe('applyImprovement', () => {
  it('adds a KI to the AI index destination', async () => {
    const deps = createDeps();

    const id = await applyImprovement(
      improvement('add_ki', { payload: { ki: { type: 'document', title: 'Refund window' } } }),
      deps
    );

    expect(id).toBe('ki-new');
    expect(addKiMock).toHaveBeenCalledWith(
      expect.objectContaining({ dest, ki: { type: 'document', title: 'Refund window' } })
    );
  });

  it('edits the targeted KI from its patch', async () => {
    const deps = createDeps();

    const id = await applyImprovement(
      improvement('edit_ki', {
        target: { ki_id: 'ki-1' },
        payload: { ki_patch: { content: '45 days' } },
      }),
      deps
    );

    expect(id).toBe('ki-1');
    expect(editKiMock).toHaveBeenCalledWith(
      expect.objectContaining({ kiId: 'ki-1', ki: { content: '45 days' } })
    );
  });

  it('passes the improvement title as the removal reason', async () => {
    const deps = createDeps();

    await applyImprovement(improvement('remove_ki', { target: { ki_id: 'ki-1' } }), deps);

    expect(removeKiMock).toHaveBeenCalledWith(
      expect.objectContaining({ kiId: 'ki-1', reason: 'Clarify the refund window' })
    );
  });

  it('adds a workflow through the registered provider', async () => {
    const workflows = createWorkflows();
    const deps = createDeps(workflows);

    const id = await applyImprovement(
      improvement('add_workflow', { payload: { workflow_yaml: 'name: Nightly\nsteps: []\n' } }),
      deps
    );

    expect(id).toBe('wf-new');
    expect(addWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflows,
        aiIndexId: 'support',
        yaml: 'name: Nightly\nsteps: []\n',
        context: { spaceId: 'default', request },
      })
    );
  });

  it('edits the targeted workflow', async () => {
    const deps = createDeps(createWorkflows());

    const id = await applyImprovement(
      improvement('edit_workflow', {
        target: { workflow_id: 'wf-1' },
        payload: { workflow_yaml: 'name: Nightly\nsteps: []\n' },
      }),
      deps
    );

    expect(id).toBe('wf-1');
    expect(editWorkflowMock).toHaveBeenCalledWith(expect.objectContaining({ workflowId: 'wf-1' }));
  });

  it('removes the targeted workflow', async () => {
    const deps = createDeps(createWorkflows());

    const id = await applyImprovement(
      improvement('remove_workflow', { target: { workflow_id: 'wf-1' } }),
      deps
    );

    expect(id).toBe('wf-1');
    expect(removeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'wf-1', aiIndexId: 'support' })
    );
  });

  it('adds a source with the approving user’s own actions client', async () => {
    const deps = createDeps();

    const id = await applyImprovement(
      improvement('add_source', { payload: { source: { type: 'esql', value: 'logs-*' } } }),
      deps
    );

    expect(id).toBe('logs-*');
    expect(addSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: 'support', actions, request }),
      { type: 'esql', value: 'logs-*' }
    );
  });

  it('edits a source by the value it replaces', async () => {
    const deps = createDeps();

    const id = await applyImprovement(
      improvement('edit_source', {
        target: { source_value: 'logs-*' },
        payload: { source: { type: 'esql', value: 'logs-2026-*' } },
      }),
      deps
    );

    expect(id).toBe('logs-2026-*');
    expect(editSourceMock).toHaveBeenCalledWith(expect.anything(), 'logs-*', {
      type: 'esql',
      value: 'logs-2026-*',
    });
  });

  it('removes a source by value', async () => {
    const deps = createDeps();

    const id = await applyImprovement(
      improvement('remove_source', { target: { source_value: 'logs-*' } }),
      deps
    );

    expect(id).toBe('logs-*');
    expect(removeSourceMock).toHaveBeenCalledWith(expect.anything(), 'logs-*');
  });

  it.each([
    ['add_ki', {}],
    ['edit_ki', { payload: { ki_patch: { title: 'x' } } }],
    ['remove_ki', {}],
    ['add_workflow', {}],
    ['edit_workflow', { payload: { workflow_yaml: 'name: x' } }],
    ['remove_workflow', {}],
    ['add_source', {}],
    ['edit_source', { payload: { source: { type: 'esql' as const, value: 'logs-*' } } }],
    ['remove_source', {}],
  ] as Array<[ImprovementAction, Partial<Improvement>]>)(
    'rejects a %s suggestion that is missing its required field',
    async (action, overrides) => {
      const deps = createDeps(createWorkflows());

      await expect(applyImprovement(improvement(action, overrides), deps)).rejects.toThrow(
        /cannot be applied/
      );
    }
  );

  it('explains that workflow suggestions need workflows to be available', async () => {
    const deps = createDeps(undefined);

    await expect(
      applyImprovement(improvement('add_workflow', { payload: { workflow_yaml: 'name: x' } }), deps)
    ).rejects.toThrow(/Workflows are not available/);
    expect(addWorkflowMock).not.toHaveBeenCalled();
  });

  it('does not resolve the destination for workflow actions', async () => {
    const deps = createDeps(createWorkflows());

    await applyImprovement(
      improvement('add_workflow', { payload: { workflow_yaml: 'name: x' } }),
      deps
    );

    expect(deps.aiIndexService.get).not.toHaveBeenCalled();
  });
});
