/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Action } from '@kbn/custom-app-common';
import { ButtonActionsEditor } from './workflow_action_editor';

const mockClient = { list: jest.fn() };
jest.mock('../../workflows/workflow_client', () => ({ createWorkflowClient: () => mockClient }));
jest.mock('../../services', () => ({ getServices: () => ({ core: { http: {} } }) }));

const workflows = [
  { id: 'isolate-host', name: 'Isolate host', enabled: true, valid: true },
  { id: 'notify', name: 'Notify the team', enabled: false, valid: true },
];

const run = (overrides = {}): Action =>
  ({ type: 'runWorkflow', workflow: 'isolate-host', inputs: {}, ...overrides } as Action);

/** Holds the actions the way the editor does, and reports the latest to the test. */
const setup = (initial: Action[], stateKeys: string[] = ['host', 'reason']) => {
  const onChange = jest.fn();
  const Host = () => {
    const [actions, setActions] = useState(initial);
    return (
      <ButtonActionsEditor
        actions={actions}
        stateKeys={stateKeys}
        onChange={(next) => {
          setActions(next);
          onChange(next);
        }}
      />
    );
  };
  render(<Host />);
  return onChange;
};

describe('the editor of what a button does', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockClient.list.mockResolvedValue({ results: workflows, total: 2 });
  });

  describe('a button that does nothing', () => {
    it('says so, and offers to run a workflow', () => {
      setup([]);

      expect(screen.getByText('This does nothing yet.')).toBeInTheDocument();
      expect(screen.queryByTestId('customAppWorkflowPicker')).not.toBeInTheDocument();
    });

    it('adds a workflow to run, which is not chosen yet', async () => {
      const onChange = setup([]);

      await userEvent.click(screen.getByTestId('customAppAddWorkflowAction'));

      expect(onChange).toHaveBeenLastCalledWith([
        { type: 'runWorkflow', workflow: '', inputs: {} },
      ]);
    });
  });

  describe('choosing the workflow', () => {
    it('lists the workflows that can be seen, by name', async () => {
      setup([run({ workflow: '' })]);

      await userEvent.click(await screen.findByTestId('comboBoxSearchInput'));

      expect(await screen.findByText('Isolate host')).toBeInTheDocument();
      expect(screen.getByText('Notify the team')).toBeInTheDocument();
    });

    it('shows a disabled workflow as disabled, which cannot be chosen', async () => {
      setup([run({ workflow: '' })]);

      await userEvent.click(await screen.findByTestId('comboBoxSearchInput'));

      expect(await screen.findByText('Disabled')).toBeInTheDocument();
    });

    it('keeps the workflow chosen, by its id, when it is not among those listed', async () => {
      setup([run({ workflow: 'gone-workflow' })]);

      // A single choice is shown as the value of the box, not as text.
      expect(await screen.findByDisplayValue('gone-workflow')).toBeInTheDocument();
    });

    it('chooses the one that is picked', async () => {
      const onChange = setup([run({ workflow: '' })]);
      await userEvent.click(await screen.findByTestId('comboBoxSearchInput'));

      await userEvent.click(await screen.findByText('Isolate host'));

      expect(onChange).toHaveBeenLastCalledWith([run({ workflow: 'isolate-host' })]);
    });

    it('searches as the person types, after a short wait', async () => {
      setup([run({ workflow: '' })]);
      await userEvent.type(await screen.findByTestId('comboBoxSearchInput'), 'iso');

      await waitFor(() =>
        expect(mockClient.list).toHaveBeenLastCalledWith({ query: 'iso', size: 20 })
      );
    });

    it('asks for the id when the workflows cannot be listed, so that it can still be set', async () => {
      mockClient.list.mockRejectedValue({ body: { statusCode: 403 } });
      const onChange = setup([run({ workflow: '' })]);

      await screen.findByText(/cannot be listed for you/);
      await userEvent.type(screen.getByRole('textbox', { name: 'Workflow' }), 'x');

      expect(onChange).toHaveBeenLastCalledWith([run({ workflow: 'x' })]);
    });

    it('says whose privileges it runs with', async () => {
      setup([run()]);

      expect(
        await screen.findByText('It runs with the privileges of whoever presses the button.')
      ).toBeInTheDocument();
    });
  });

  describe('what it is given', () => {
    it('adds an input with a name of its own that nothing has', async () => {
      const onChange = setup([run({ inputs: { input1: 'a' } })]);

      await userEvent.click(screen.getByTestId('customAppAddWorkflowInput'));

      expect(onChange).toHaveBeenLastCalledWith([run({ inputs: { input1: 'a', input2: '' } })]);
    });

    it('names an input, keeping the others and their order', async () => {
      const onChange = setup([run({ inputs: { a: '1', b: '2' } })]);

      await userEvent.type(screen.getByLabelText('Input name 1'), 'x');

      expect(onChange).toHaveBeenLastCalledWith([run({ inputs: { ax: '1', b: '2' } })]);
    });

    it('gives an input a fixed value', async () => {
      const onChange = setup([run({ inputs: { reason: '' } })]);

      await userEvent.type(screen.getByLabelText('Input 1 value'), 'S');

      expect(onChange).toHaveBeenLastCalledWith([run({ inputs: { reason: 'S' } })]);
    });

    it('takes an input from a value of the app instead, chosen from those the app has', async () => {
      const onChange = setup([run({ inputs: { host: 'web-1' } })]);

      await userEvent.selectOptions(screen.getByLabelText('Input 1 comes from'), 'state');
      expect(onChange).toHaveBeenLastCalledWith([run({ inputs: { host: { fromState: 'host' } } })]);

      await userEvent.selectOptions(screen.getByLabelText('Input 1 value'), 'reason');
      expect(onChange).toHaveBeenLastCalledWith([
        run({ inputs: { host: { fromState: 'reason' } } }),
      ]);
    });

    it('goes back to a fixed value, which starts empty', async () => {
      const onChange = setup([run({ inputs: { host: { fromState: 'host' } } })]);

      await userEvent.selectOptions(screen.getByLabelText('Input 1 comes from'), 'value');

      expect(onChange).toHaveBeenLastCalledWith([run({ inputs: { host: '' } })]);
    });

    it('removes an input', async () => {
      const onChange = setup([run({ inputs: { a: '1', b: '2' } })]);

      await userEvent.click(screen.getByRole('button', { name: 'Remove input 1' }));

      expect(onChange).toHaveBeenLastCalledWith([run({ inputs: { b: '2' } })]);
    });

    it('stops at the number of inputs a workflow may be given', () => {
      const inputs = Object.fromEntries(Array.from({ length: 20 }, (_u, i) => [`i${i}`, 'x']));
      setup([run({ inputs })]);

      expect(screen.getByTestId('customAppAddWorkflowInput')).toBeDisabled();
    });
  });

  describe('taking the workflow away', () => {
    it('leaves a button that does nothing', async () => {
      const onChange = setup([run()]);

      await userEvent.click(screen.getByTestId('customAppRemoveWorkflowAction'));

      expect(onChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe('a button that does other things as well', () => {
    const flyout: Action = { type: 'openFlyout', flyout: 'detail' };

    it('says that they are kept', async () => {
      setup([flyout, run()]);

      expect(
        await screen.findByText(/also does 1 other thing, which are kept as they are/)
      ).toBeInTheDocument();
    });

    it('changes only the workflow, in its place among the actions', async () => {
      const onChange = setup([flyout, run()]);

      await userEvent.click(screen.getByTestId('customAppAddWorkflowInput'));

      expect(onChange).toHaveBeenLastCalledWith([flyout, run({ inputs: { input1: '' } })]);
    });

    it('keeps them when the workflow is taken away', async () => {
      const onChange = setup([flyout, run()]);

      await userEvent.click(screen.getByTestId('customAppRemoveWorkflowAction'));

      expect(onChange).toHaveBeenLastCalledWith([flyout]);
    });

    it('adds a workflow after them when there is none', async () => {
      const onChange = setup([flyout]);

      await userEvent.click(screen.getByTestId('customAppAddWorkflowAction'));

      expect(onChange).toHaveBeenLastCalledWith([
        flyout,
        { type: 'runWorkflow', workflow: '', inputs: {} },
      ]);
    });
  });
});
