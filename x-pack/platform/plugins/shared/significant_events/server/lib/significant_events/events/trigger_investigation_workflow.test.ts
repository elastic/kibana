/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { installInvestigationAgent } from '../../../memory_and_investigation/lib/investigation/install_investigation_agent';
import { triggerInvestigationWorkflow } from './trigger_investigation_workflow';

jest.mock(
  '../../../memory_and_investigation/lib/investigation/install_investigation_agent',
  () => ({ installInvestigationAgent: jest.fn() })
);

const installInvestigationAgentMock = installInvestigationAgent as jest.MockedFunction<
  typeof installInvestigationAgent
>;

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-1',
  event_id: 'checkout-latency-breach',
  status: 'open',
  stream_names: ['logs.checkout', 'metrics.checkout'],
  title: 'Checkout latency breach',
  summary: 'P99 latency climbed above 2s.',
  severity: '60-high',
  confidence: 0.9,
  ...overrides,
});

const createWorkflowsManagement = ({
  workflowExists = true,
  executionId = 'exec-abc',
}: {
  workflowExists?: boolean;
  executionId?: string;
} = {}) => ({
  management: {
    getWorkflow: jest
      .fn()
      .mockResolvedValue(
        workflowExists
          ? { id: 'system-significant-events-investigation', definition: 'yaml: ...' }
          : null
      ),
    runWorkflow: jest.fn().mockResolvedValue(executionId),
  },
});

const createSpaces = (spaceId = 'default') => ({
  spacesService: {
    getSpaceId: jest.fn().mockReturnValue(spaceId),
  },
});

const createRequest = () => ({} as KibanaRequest);
const createAgentBuilder = () => ({} as never);
const createLogger = () =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

describe('triggerInvestigationWorkflow', () => {
  beforeEach(() => {
    installInvestigationAgentMock.mockResolvedValue();
  });

  it('returns the execution id when the workflow starts successfully', async () => {
    const event = createEvent();
    const workflowsManagement = createWorkflowsManagement();
    const spaces = createSpaces();

    const result = await triggerInvestigationWorkflow({
      workflowsManagement: workflowsManagement as never,
      agentBuilder: createAgentBuilder(),
      spaces: spaces as never,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    expect(result).toBe('exec-abc');
    expect(installInvestigationAgentMock).toHaveBeenCalledWith({
      agentBuilder: expect.anything(),
      spaceId: 'default',
    });
    expect(workflowsManagement.management.runWorkflow).toHaveBeenCalledTimes(1);
    expect(installInvestigationAgentMock.mock.invocationCallOrder[0]).toBeLessThan(
      workflowsManagement.management.runWorkflow.mock.invocationCallOrder[0]
    );
  });

  it('builds the message from event title and summary', async () => {
    const event = createEvent({
      title: 'High error rate',
      summary: 'Error rate spiked.',
    });
    const workflowsManagement = createWorkflowsManagement();

    await triggerInvestigationWorkflow({
      workflowsManagement: workflowsManagement as never,
      agentBuilder: createAgentBuilder(),
      spaces: createSpaces() as never,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [, , inputs] = workflowsManagement.management.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('High error rate\n\nError rate spiked.');
  });

  it('uses event_id as the concurrency_key', async () => {
    const event = createEvent({ event_id: 'my-slug' });
    const workflowsManagement = createWorkflowsManagement();

    await triggerInvestigationWorkflow({
      workflowsManagement: workflowsManagement as never,
      agentBuilder: createAgentBuilder(),
      spaces: createSpaces() as never,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [, , inputs] = workflowsManagement.management.runWorkflow.mock.calls[0];
    expect(inputs.concurrency_key).toBe('my-slug');
  });

  it('includes event_uuid in the context so the workflow can attach investigations', async () => {
    const event = createEvent({ event_uuid: 'event-42' });
    const workflowsManagement = createWorkflowsManagement();

    await triggerInvestigationWorkflow({
      workflowsManagement: workflowsManagement as never,
      agentBuilder: createAgentBuilder(),
      spaces: createSpaces() as never,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [, , inputs] = workflowsManagement.management.runWorkflow.mock.calls[0];
    expect(inputs.context.event_uuid).toBe('event-42');
    expect(inputs.context.source).toBe('significant_event');
  });

  it('returns undefined when workflowsManagement is not available', async () => {
    const result = await triggerInvestigationWorkflow({
      workflowsManagement: undefined,
      agentBuilder: createAgentBuilder(),
      spaces: createSpaces() as never,
      request: createRequest(),
      logger: createLogger(),
      event: createEvent(),
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when the managed workflow is not installed', async () => {
    const workflowsManagement = createWorkflowsManagement({ workflowExists: false });

    const result = await triggerInvestigationWorkflow({
      workflowsManagement: workflowsManagement as never,
      agentBuilder: createAgentBuilder(),
      spaces: createSpaces() as never,
      request: createRequest(),
      logger: createLogger(),
      event: createEvent(),
    });

    expect(result).toBeUndefined();
    expect(workflowsManagement.management.runWorkflow).not.toHaveBeenCalled();
  });

  it('uses DEFAULT_SPACE_ID when spaces plugin is not available', async () => {
    const event = createEvent();
    const workflowsManagement = createWorkflowsManagement();

    await triggerInvestigationWorkflow({
      workflowsManagement: workflowsManagement as never,
      agentBuilder: createAgentBuilder(),
      spaces: undefined,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [, spaceId] = workflowsManagement.management.runWorkflow.mock.calls[0];
    expect(spaceId).toBe('default');
  });
});
