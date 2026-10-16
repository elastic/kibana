/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getWorkflowAvailability,
  useWorkflowRunner,
  WorkflowRunnerProvider,
} from './workflow_runner';
import type { WorkflowRunRequest } from '../runtime/app_runtime';

const mockClient = { get: jest.fn(), run: jest.fn(), list: jest.fn() };
const toasts = { addSuccess: jest.fn(), addDanger: jest.fn(), addWarning: jest.fn() };
const navigateToApp = jest.fn();
let mockCapabilities: Record<string, unknown> = {};

jest.mock('./workflow_client', () => ({ createWorkflowClient: () => mockClient }));
jest.mock('@kbn/react-kibana-mount', () => ({
  // The toast text is a mount point in Kibana; here it is the element, so that it can be pressed.
  toMountPoint: (node: unknown) => node,
}));
jest.mock('../services', () => ({
  getServices: () => ({
    core: {
      http: {},
      rendering: {},
      application: {
        navigateToApp,
        get capabilities() {
          return mockCapabilities;
        },
      },
      notifications: { toasts },
    },
  }),
}));

const CAN_RUN = { workflowsManagement: { executeWorkflow: true } };
const workflow = (overrides = {}) => ({
  id: 'isolate-host',
  name: 'Isolate host',
  description: 'Cuts the host off the network',
  enabled: true,
  valid: true,
  ...overrides,
});

const Asker = ({ requests }: { requests: WorkflowRunRequest[] }) => {
  const runner = useWorkflowRunner();
  return (
    <button type="button" onClick={() => runner.request(requests, 'go')}>
      {'ask'}
    </button>
  );
};

const setup = (
  requests: WorkflowRunRequest[] = [{ workflow: 'isolate-host', inputs: { host: 'web-1' } }],
  appId?: string
) => {
  render(
    <WorkflowRunnerProvider appId={appId}>
      <Asker requests={requests} />
    </WorkflowRunnerProvider>
  );
};

const ask = async () => userEvent.click(screen.getByRole('button', { name: 'ask' }));

describe('who may run workflows', () => {
  it('may when the Execute privilege of Workflows is there', () => {
    expect(getWorkflowAvailability(CAN_RUN as never)).toEqual({ canRun: true });
  });

  it('may not without it, and says which privilege', () => {
    const result = getWorkflowAvailability({
      workflowsManagement: { executeWorkflow: false },
    } as never);

    expect(result).toMatchObject({ canRun: false });
    expect((result as { reason: string }).reason).toContain('Execute privilege');
  });

  it('may not when Workflows are not there at all, and says so instead of blaming the role', () => {
    const result = getWorkflowAvailability({} as never);

    expect(result).toMatchObject({ canRun: false });
    expect((result as { reason: string }).reason).toContain('license');
  });
});

describe('running the workflows an action asks for', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCapabilities = CAN_RUN;
    mockClient.get.mockResolvedValue(workflow());
    mockClient.run.mockResolvedValue({ workflowExecutionId: 'exec-1' });
  });

  it('asks first, naming the workflow and what it is given, and runs nothing yet', async () => {
    setup();

    await ask();

    expect(await screen.findByText('Isolate host')).toBeInTheDocument();
    expect(screen.getByText('Cuts the host off the network')).toBeInTheDocument();
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('"web-1"')).toBeInTheDocument();
    expect(mockClient.run).not.toHaveBeenCalled();
  });

  it('says that it runs with the privileges of the person who agrees', async () => {
    setup();

    await ask();

    expect(await screen.findByText(/with your own privileges/)).toBeInTheDocument();
  });

  it('says when a workflow is given nothing', async () => {
    setup([{ workflow: 'isolate-host', inputs: {} }]);

    await ask();

    expect(await screen.findByText('It is given no inputs.')).toBeInTheDocument();
  });

  it('runs it when agreed, with the inputs, and where the run comes from', async () => {
    setup(undefined, 'app-1');
    await ask();
    await screen.findByText('Isolate host');

    await userEvent.click(screen.getByTestId('customAppRunWorkflowConfirm'));

    await waitFor(() =>
      expect(mockClient.run).toHaveBeenCalledWith('isolate-host', {
        inputs: { host: 'web-1' },
        metadata: { source: 'custom_app', nodeId: 'go', appId: 'app-1' },
      })
    );
    await waitFor(() =>
      expect(screen.queryByTestId('customAppRunWorkflowModal')).not.toBeInTheDocument()
    );
  });

  it('sends no app with the run when the app is not a saved one', async () => {
    setup();
    await ask();
    await screen.findByText('Isolate host');

    await userEvent.click(screen.getByTestId('customAppRunWorkflowConfirm'));

    await waitFor(() => expect(mockClient.run).toHaveBeenCalled());
    expect(mockClient.run.mock.calls[0][1].metadata).toEqual({
      source: 'custom_app',
      nodeId: 'go',
    });
  });

  it('says that it started, with a way to its execution', async () => {
    setup();
    await ask();
    await screen.findByText('Isolate host');

    await userEvent.click(screen.getByTestId('customAppRunWorkflowConfirm'));

    await waitFor(() => expect(toasts.addSuccess).toHaveBeenCalled());
    const { text } = toasts.addSuccess.mock.calls[0][0];
    render(<>{text}</>);
    await userEvent.click(screen.getByText('View the execution'));
    expect(navigateToApp).toHaveBeenCalledWith('workflows', {
      path: '/isolate-host?tab=executions&executionId=exec-1',
    });
  });

  it('does not run it when it is not agreed', async () => {
    setup();
    await ask();
    await screen.findByText('Isolate host');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockClient.run).not.toHaveBeenCalled();
    expect(screen.queryByTestId('customAppRunWorkflowModal')).not.toBeInTheDocument();
  });

  it('says why it could not run, and does not say it started', async () => {
    mockClient.run.mockRejectedValue({ body: { message: 'Workflow is disabled' } });
    setup();
    await ask();
    await screen.findByText('Isolate host');

    await userEvent.click(screen.getByTestId('customAppRunWorkflowConfirm'));

    await waitFor(() =>
      expect(toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Workflow is disabled' })
      )
    );
    expect(toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('runs each workflow it was asked for, in order, after one agreement', async () => {
    setup([
      { workflow: 'first', inputs: {} },
      { workflow: 'second', inputs: {} },
    ]);
    mockClient.get.mockImplementation(async (id: string) =>
      workflow({ id, name: `Name of ${id}` })
    );
    await ask();
    await screen.findByText('Name of second');

    await userEvent.click(screen.getByTestId('customAppRunWorkflowConfirm'));

    await waitFor(() => expect(mockClient.run).toHaveBeenCalledTimes(2));
    expect(mockClient.run.mock.calls.map(([id]) => id)).toEqual(['first', 'second']);
  });

  it('keeps going with the others when one fails, and says which failed', async () => {
    setup([
      { workflow: 'first', inputs: {} },
      { workflow: 'second', inputs: {} },
    ]);
    mockClient.get.mockImplementation(async (id: string) =>
      workflow({ id, name: `Name of ${id}` })
    );
    mockClient.run.mockRejectedValueOnce(new Error('first failed')).mockResolvedValueOnce({
      workflowExecutionId: 'exec-2',
    });
    await ask();
    await screen.findByText('Name of second');

    await userEvent.click(screen.getByTestId('customAppRunWorkflowConfirm'));

    await waitFor(() => expect(mockClient.run).toHaveBeenCalledTimes(2));
    expect(toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  describe('a workflow that cannot be run', () => {
    it('cannot be agreed to when it is disabled, which is said', async () => {
      mockClient.get.mockResolvedValue(workflow({ enabled: false }));
      setup();

      await ask();

      expect(await screen.findByText(/This workflow is disabled/)).toBeInTheDocument();
      expect(screen.getByTestId('customAppRunWorkflowConfirm')).toBeDisabled();
    });

    it('cannot be agreed to when it is not valid', async () => {
      mockClient.get.mockResolvedValue(workflow({ valid: false }));
      setup();

      await ask();

      expect(await screen.findByText(/not valid, so it cannot be run/)).toBeInTheDocument();
      expect(screen.getByTestId('customAppRunWorkflowConfirm')).toBeDisabled();
    });

    it('cannot be agreed to when it does not exist or cannot be seen', async () => {
      mockClient.get.mockRejectedValue({ body: { statusCode: 404 } });
      setup();

      await ask();

      expect(await screen.findByText(/does not exist, or you cannot see it/)).toBeInTheDocument();
      expect(screen.getByTestId('customAppRunWorkflowConfirm')).toBeDisabled();
    });

    it('cannot be agreed to while it is not known what it is', async () => {
      mockClient.get.mockReturnValue(new Promise(() => {}));
      setup();

      await ask();

      expect(await screen.findByTestId('customAppRunWorkflowModal')).toBeInTheDocument();
      expect(screen.getByTestId('customAppRunWorkflowConfirm')).toBeDisabled();
    });
  });

  describe('without the privilege', () => {
    it('does not even ask, and says why in a warning', async () => {
      mockCapabilities = { workflowsManagement: { executeWorkflow: false } };
      setup();

      await ask();

      expect(screen.queryByTestId('customAppRunWorkflowModal')).not.toBeInTheDocument();
      expect(toasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Execute privilege') })
      );
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.run).not.toHaveBeenCalled();
    });
  });
});
