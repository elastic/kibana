/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { ImprovementAction, ImprovementEnvelope } from '../../../common/http_api/improvements';
import type { AiIndexService } from '../../ai_indices/service';
import type { WorkflowProvider } from '../../workflows/provider';
import { applyImprovement } from '.';
import { addKi, editKi, removeKi } from './ki';
import { addWorkflow, editWorkflow, removeWorkflow } from './workflow';

jest.mock('./ki');
jest.mock('./workflow');

const addKiMock = addKi as jest.MockedFunction<typeof addKi>;
const editKiMock = editKi as jest.MockedFunction<typeof editKi>;
const removeKiMock = removeKi as jest.MockedFunction<typeof removeKi>;
const addWorkflowMock = addWorkflow as jest.MockedFunction<typeof addWorkflow>;
const editWorkflowMock = editWorkflow as jest.MockedFunction<typeof editWorkflow>;
const removeWorkflowMock = removeWorkflow as jest.MockedFunction<typeof removeWorkflow>;

const dest = { type: 'data_stream' as const, value: 'ai-index-ds-support' };
const request = httpServerMock.createKibanaRequest();

const createDeps = (workflows?: WorkflowProvider) => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  aiIndexService: {
    get: jest.fn().mockResolvedValue({ id: 'support', dest }),
  } as unknown as jest.Mocked<AiIndexService>,
  workflows,
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
  overrides: Partial<ImprovementEnvelope> = {}
): ImprovementEnvelope => ({
  improvement_id: 'imp-1',
  ai_index_id: 'support',
  status: 'proposed',
  action,
  title: 'Clarify the refund window',
  rationale: 'Three unanswered questions mentioned refunds.',
  payload: {},
  suggested_at: '2026-08-20T09:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  addKiMock.mockResolvedValue('ki-new');
  editKiMock.mockResolvedValue('ki-1');
  removeKiMock.mockResolvedValue('ki-1');
  addWorkflowMock.mockResolvedValue('wf-new');
  editWorkflowMock.mockResolvedValue('wf-1');
  removeWorkflowMock.mockResolvedValue('wf-1');
});

describe('applyImprovement', () => {
  it('adds a KI to the AI index destination', async () => {
    const deps = createDeps();

    const id = await applyImprovement(
      improvement('add_ki', { payload: { ki: { title: 'Refund window' } } }),
      deps
    );

    expect(id).toBe('ki-new');
    expect(addKiMock).toHaveBeenCalledWith(
      expect.objectContaining({ dest, ki: { title: 'Refund window' } })
    );
  });

  it('edits the targeted KI', async () => {
    const deps = createDeps();

    const id = await applyImprovement(
      improvement('edit_ki', {
        target: { ki_id: 'ki-1' },
        payload: { ki: { content: '45 days' } },
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

  it.each([
    ['add_ki', {}],
    ['edit_ki', { payload: { ki: { title: 'x' } } }],
    ['remove_ki', {}],
    ['add_workflow', {}],
    ['edit_workflow', { payload: { workflow_yaml: 'name: x' } }],
    ['remove_workflow', {}],
  ] as Array<[ImprovementAction, Partial<ImprovementEnvelope>]>)(
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
