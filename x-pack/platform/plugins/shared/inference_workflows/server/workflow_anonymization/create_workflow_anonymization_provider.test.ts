/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { MessageRole } from '@kbn/inference-common';
import type {
  AroundCompletionEvent,
  InferenceProceedCapability,
  PiiTokenizationContext,
} from '@kbn/inference-plugin/server';
import { ExecutionStatus, type WorkflowDetailDto, type WorkflowYaml } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import {
  INFERENCE_PROCEED_CAPABILITY_ID,
  PII_TOKENIZATION_CAPABILITY_ID,
} from '@kbn/inference-plugin/server';
import { aroundCompletionEventSchema } from '../../common/workflow_anonymization';
import { createWorkflowAnonymizationProvider } from './create_workflow_anonymization_provider';

type Management = Pick<
  WorkflowsManagementApi,
  'resolveWorkflowTriggerMatches' | 'executeWorkflowSynchronously'
>;

const createManagement = (): jest.Mocked<Management> => ({
  resolveWorkflowTriggerMatches: jest.fn(),
  executeWorkflowSynchronously: jest.fn(),
});

const createAroundCompletionTrigger = (): WorkflowYaml['triggers'][number] => {
  // The static WorkflowYaml type models built-ins only; registered triggers are added dynamically.
  const trigger: WorkflowYaml['triggers'][number] = { type: 'manual' };
  Reflect.set(trigger, 'type', 'inference.aroundCompletion');
  return trigger;
};

const createWorkflow = (steps: WorkflowYaml['steps']): WorkflowDetailDto => ({
  id: 'workflow-1',
  name: 'Inference protection',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'system',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'system',
  yaml: 'name: Inference protection',
  valid: true,
  definition: {
    version: '1',
    name: 'Inference protection',
    enabled: true,
    triggers: [createAroundCompletionTrigger()],
    steps,
  },
});

const proceedStep: WorkflowYaml['steps'][number] = {
  name: 'proceed',
  type: 'call_site.proceed',
  with: {},
};

const event: AroundCompletionEvent = {
  messages: [{ role: MessageRole.User, content: 'hello' }],
};
const pii: PiiTokenizationContext = {
  detectEntities: jest.fn().mockResolvedValue([]),
  tokenize: jest.fn(),
};
const proceed: InferenceProceedCapability = {
  invoke: jest.fn().mockResolvedValue({ rawContent: 'protected' }),
};

describe('createWorkflowAnonymizationProvider', () => {
  it('returns without execution when no workflow matches', async () => {
    const management = createManagement();
    management.resolveWorkflowTriggerMatches.mockResolvedValue({
      matched: [],
      invalidConditionWorkflowIds: [],
    });
    const provider = createWorkflowAnonymizationProvider({ management });

    await expect(
      provider.execute({
        event,
        namespace: 'space-a',
        request: httpServerMock.createKibanaRequest(),
        pii,
        proceed,
      })
    ).resolves.toEqual({ matched: false });
    expect(management.executeWorkflowSynchronously).not.toHaveBeenCalled();
  });

  it('executes one matching workflow synchronously with request-local capabilities', async () => {
    const management = createManagement();
    management.resolveWorkflowTriggerMatches.mockResolvedValue({
      matched: [createWorkflow([proceedStep])],
      invalidConditionWorkflowIds: [],
    });
    management.executeWorkflowSynchronously.mockResolvedValue({
      workflowExecutionId: 'execution-1',
      result: { status: ExecutionStatus.COMPLETED, output: { content: 'restored content' } },
    });
    const provider = createWorkflowAnonymizationProvider({ management });
    const request = httpServerMock.createKibanaRequest();
    const abortSignal = new AbortController().signal;
    const parsedEvent = aroundCompletionEventSchema.parse(event);

    await expect(
      provider.execute({ event, namespace: 'space-a', request, pii, proceed, abortSignal })
    ).resolves.toEqual({ matched: true, content: 'restored content' });
    expect(management.executeWorkflowSynchronously).toHaveBeenCalledWith({
      workflowId: 'workflow-1',
      workflow: expect.objectContaining({ id: 'workflow-1' }),
      context: {
        event: parsedEvent,
        spaceId: 'space-a',
        triggeredBy: 'inference.aroundCompletion',
      },
      spaceId: 'space-a',
      request,
      capabilities: [
        { id: PII_TOKENIZATION_CAPABILITY_ID, value: pii },
        { id: INFERENCE_PROCEED_CAPABILITY_ID, value: proceed },
      ],
      abortSignal,
    });
    const [{ context }] = management.executeWorkflowSynchronously.mock.calls[0];
    expect(context.event).not.toBe(event);
  });

  it('rejects invalid trigger conditions and overlapping workflow matches before execution', async () => {
    const management = createManagement();
    const provider = createWorkflowAnonymizationProvider({ management });

    management.resolveWorkflowTriggerMatches.mockResolvedValue({
      matched: [createWorkflow([proceedStep])],
      invalidConditionWorkflowIds: ['invalid-workflow'],
    });
    await expect(
      provider.execute({
        event,
        namespace: 'space-a',
        request: httpServerMock.createKibanaRequest(),
        pii,
        proceed,
      })
    ).rejects.toThrow('invalid-workflow');
    expect(management.executeWorkflowSynchronously).not.toHaveBeenCalled();

    management.resolveWorkflowTriggerMatches.mockResolvedValue({
      matched: [createWorkflow([proceedStep]), createWorkflow([proceedStep])],
      invalidConditionWorkflowIds: [],
    });
    await expect(
      provider.execute({
        event,
        namespace: 'space-a',
        request: httpServerMock.createKibanaRequest(),
        pii,
        proceed,
      })
    ).rejects.toThrow('Multiple workflows matched');
    expect(management.executeWorkflowSynchronously).not.toHaveBeenCalled();
  });

  it('requires exactly one proceed step and a string workflow output', async () => {
    const management = createManagement();
    const provider = createWorkflowAnonymizationProvider({ management });

    management.resolveWorkflowTriggerMatches.mockResolvedValue({
      matched: [createWorkflow([])],
      invalidConditionWorkflowIds: [],
    });
    await expect(
      provider.execute({
        event,
        namespace: 'space-a',
        request: httpServerMock.createKibanaRequest(),
        pii,
        proceed,
      })
    ).rejects.toThrow('must contain exactly one');

    management.resolveWorkflowTriggerMatches.mockResolvedValue({
      matched: [createWorkflow([proceedStep])],
      invalidConditionWorkflowIds: [],
    });
    management.executeWorkflowSynchronously.mockResolvedValue({
      workflowExecutionId: 'execution-1',
      result: { status: ExecutionStatus.COMPLETED, output: {} },
    });
    await expect(
      provider.execute({
        event,
        namespace: 'space-a',
        request: httpServerMock.createKibanaRequest(),
        pii,
        proceed,
      })
    ).rejects.toThrow('did not return string content');
  });
});
