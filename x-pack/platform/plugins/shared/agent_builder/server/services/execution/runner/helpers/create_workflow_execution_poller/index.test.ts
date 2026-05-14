/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowExecutionPoller } from '.';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  getExecutionState: jest.fn(),
}));

import { getExecutionState } from '@kbn/agent-builder-tools-base/workflows';

const getExecutionStateMock = getExecutionState as jest.MockedFn<typeof getExecutionState>;

const mockManagement = { getWorkflowExecution: jest.fn() } as any;
const mockWorkflowsManagement = { management: mockManagement };

describe('createWorkflowExecutionPoller', () => {
  beforeEach(() => {
    getExecutionStateMock.mockReset();
  });

  it('returns undefined when inboxEnabled is false', () => {
    const poller = createWorkflowExecutionPoller({
      inboxEnabled: false,
      spaceId: 'default',
      workflowsManagement: mockWorkflowsManagement as any,
    });

    expect(poller).toBeUndefined();
  });

  it('returns undefined when inboxEnabled is not provided', () => {
    const poller = createWorkflowExecutionPoller({
      spaceId: 'default',
      workflowsManagement: mockWorkflowsManagement as any,
    });

    expect(poller).toBeUndefined();
  });

  it('returns undefined when workflowsManagement is absent', () => {
    const poller = createWorkflowExecutionPoller({
      inboxEnabled: true,
      spaceId: 'default',
      workflowsManagement: undefined,
    });

    expect(poller).toBeUndefined();
  });

  it('returns a function when inboxEnabled is true and workflowsManagement is provided', () => {
    const poller = createWorkflowExecutionPoller({
      inboxEnabled: true,
      spaceId: 'default',
      workflowsManagement: mockWorkflowsManagement as any,
    });

    expect(poller).toBeDefined();
    expect(typeof poller).toBe('function');
  });

  it('invokes getExecutionState with executionId, spaceId, and workflowApi', async () => {
    const executionId = 'exec-abc-123';
    const spaceId = 'test-space';
    getExecutionStateMock.mockResolvedValue(null);

    const poller = createWorkflowExecutionPoller({
      inboxEnabled: true,
      spaceId,
      workflowsManagement: mockWorkflowsManagement as any,
    });

    await poller!(executionId);

    expect(getExecutionStateMock).toHaveBeenCalledTimes(1);
    expect(getExecutionStateMock).toHaveBeenCalledWith({
      executionId,
      spaceId,
      workflowApi: mockManagement,
    });
  });
});
