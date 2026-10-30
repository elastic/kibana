/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import type { WorkflowRunner } from '../workflows/workflow_runner';
import { NodeRenderer } from './node_renderer';
import { renderWithRuntime } from './test_utils';

const mockRunner: WorkflowRunner = {
  availability: { canRun: true },
  statuses: {},
  track: jest.fn(),
  request: jest.fn(),
};
jest.mock('../workflows/workflow_runner', () => ({
  useWorkflowRunner: () => mockRunner,
}));

const text = (value = '') => ({ type: 'string', default: value });

const run = {
  type: 'runWorkflow',
  workflow: 'escalate',
  inputs: { reason: { fromState: 'reason' }, urgency: { fromState: 'urgency' } },
};

const documentWith = (
  form: Record<string, unknown> = {},
  state: Record<string, unknown> = {}
): AppDocument =>
  appDocumentSchema.parse({
    state: { reason: text(), urgency: text('low'), ...state },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        {
          type: 'form',
          id: 'ask',
          submitLabel: 'Escalate',
          fields: [
            { bind: 'reason', kind: 'textarea', label: 'Reason', required: true },
            {
              bind: 'urgency',
              kind: 'select',
              label: 'Urgency',
              options: [
                { value: 'low', label: 'Low' },
                { value: 'high', label: 'High' },
              ],
            },
          ],
          onSubmit: [run],
          ...form,
        },
        { type: 'flyout', id: 'thanks', title: 'Thanks', children: [] },
      ],
    },
  });

const show = (document: AppDocument) =>
  renderWithRuntime(<NodeRenderer node={document.root} />, document);

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Escalate' }));

describe('the form', () => {
  beforeEach(() => {
    (mockRunner.request as jest.Mock).mockReset();
    mockRunner.availability = { canRun: true };
    mockRunner.statuses = {};
    (mockRunner.track as jest.Mock).mockReset();
  });

  it('shows each field with its label, and what is written on the button', () => {
    show(documentWith());

    expect(screen.getByLabelText('Reason')).toHaveValue('');
    expect(screen.getByLabelText('Urgency')).toHaveValue('low');
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeEnabled();
  });

  it('says which fields must be answered', () => {
    show(documentWith());

    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('changes nothing while it is typed in', async () => {
    const { runtime } = show(documentWith());

    await userEvent.type(screen.getByLabelText('Reason'), 'Looks like a breach');
    await userEvent.selectOptions(screen.getByLabelText('Urgency'), 'high');

    expect(runtime.state$.getValue()).toEqual({ reason: '', urgency: 'low' });
    expect(mockRunner.request).not.toHaveBeenCalled();
  });

  it('puts the answers in their values when it is submitted, and asks for the workflow with them', async () => {
    const { runtime } = show(documentWith());

    await userEvent.type(screen.getByLabelText('Reason'), 'Looks like a breach');
    await userEvent.selectOptions(screen.getByLabelText('Urgency'), 'high');
    await submit();

    expect(runtime.state$.getValue()).toEqual({ reason: 'Looks like a breach', urgency: 'high' });
    expect(mockRunner.request).toHaveBeenCalledWith(
      [{ workflow: 'escalate', inputs: { reason: 'Looks like a breach', urgency: 'high' } }],
      'ask'
    );
  });

  it('is submitted with Enter in a one-line field too', async () => {
    show(
      documentWith({
        fields: [{ bind: 'reason', kind: 'text', label: 'Reason', required: true }],
        onSubmit: [
          { type: 'runWorkflow', workflow: 'escalate', inputs: { r: { fromState: 'reason' } } },
        ],
      })
    );

    await userEvent.type(screen.getByLabelText('Reason'), 'Why not{Enter}');

    expect(mockRunner.request).toHaveBeenCalledWith(
      [{ workflow: 'escalate', inputs: { r: 'Why not' } }],
      'ask'
    );
  });

  it('sends the answers without the spaces around them', async () => {
    const { runtime } = show(documentWith());

    await userEvent.type(screen.getByLabelText('Reason'), '   spaced out  ');
    await submit();

    expect(runtime.state$.getValue().reason).toBe('spaced out');
  });

  it('does nothing, and says what is missing, while a required answer is empty', async () => {
    const { runtime } = show(documentWith());

    await submit();

    expect(screen.getByText('This is needed to continue.')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInvalid();
    expect(mockRunner.request).not.toHaveBeenCalled();
    expect(runtime.state$.getValue().reason).toBe('');
  });

  it('counts an answer of spaces as empty', async () => {
    show(documentWith());

    await userEvent.type(screen.getByLabelText('Reason'), '   ');
    await submit();

    expect(screen.getByText('This is needed to continue.')).toBeInTheDocument();
    expect(mockRunner.request).not.toHaveBeenCalled();
  });

  it('stops saying so once it is answered and submitted', async () => {
    show(documentWith());
    await submit();

    await userEvent.type(screen.getByLabelText('Reason'), 'Because');
    await submit();

    expect(screen.queryByText('This is needed to continue.')).not.toBeInTheDocument();
    expect(mockRunner.request).toHaveBeenCalledTimes(1);
  });

  it('lets an answer that is not required stay empty', async () => {
    show(
      documentWith({
        fields: [{ bind: 'reason', kind: 'text', label: 'Reason' }],
        onSubmit: [
          { type: 'runWorkflow', workflow: 'escalate', inputs: { r: { fromState: 'reason' } } },
        ],
      })
    );

    await submit();

    expect(mockRunner.request).toHaveBeenCalledWith(
      [{ workflow: 'escalate', inputs: { r: '' } }],
      'ask'
    );
  });

  it('shows what the app already holds in a field', () => {
    show(documentWith({}, { reason: text('Already known') }));

    expect(screen.getByLabelText('Reason')).toHaveValue('Already known');
  });

  it('follows a value that another part of the app changes, until it is typed in', () => {
    const { runtime } = show(documentWith());

    act(() => {
      runtime.run([{ type: 'setState', key: 'reason', value: 'From elsewhere' }]);
    });

    expect(screen.getByLabelText('Reason')).toHaveValue('From elsewhere');
  });

  it('does the other things it was asked to as well, in order, after the answers are in', async () => {
    const { runtime } = show(
      documentWith({
        fields: [{ bind: 'reason', kind: 'text', label: 'Reason' }],
        onSubmit: [
          { type: 'setState', key: 'urgency', value: 'high' },
          { type: 'openFlyout', flyout: 'thanks' },
        ],
      })
    );

    await userEvent.type(screen.getByLabelText('Reason'), 'Because');
    await submit();

    expect(runtime.state$.getValue()).toEqual({ reason: 'Because', urgency: 'high' });
    expect(runtime.openFlyoutId$.getValue()).toBe('thanks');
  });

  it('shows nothing chosen in a choice that has no answer yet, and takes one when it is chosen', async () => {
    const { runtime } = show(
      documentWith(
        {
          fields: [
            {
              bind: 'urgency',
              kind: 'select',
              label: 'Urgency',
              required: true,
              options: [{ value: 'low' }, { value: 'high' }],
            },
          ],
          onSubmit: [],
        },
        { urgency: text('') }
      )
    );
    expect(screen.getByLabelText('Urgency')).toHaveValue('');

    await submit();
    expect(screen.getByText('This is needed to continue.')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Urgency'), 'high');
    await submit();

    expect(runtime.state$.getValue().urgency).toBe('high');
  });

  it('says why it cannot be submitted when the workflow it runs cannot be run', async () => {
    mockRunner.availability = { canRun: false, reason: 'You cannot run workflows' };
    show(documentWith());

    expect(screen.getByRole('button', { name: 'Escalate' })).toBeDisabled();
    // A disabled button takes no pointer: the tooltip is on what wraps it, which is what is hovered.
    await userEvent.hover(
      screen.getByRole('button', { name: 'Escalate' }).parentElement as HTMLElement
    );
    expect(await screen.findByText('You cannot run workflows')).toBeInTheDocument();
  });

  it('cannot be submitted while the workflow it runs is not saved, and says so', async () => {
    mockRunner.statuses = { escalate: 'missing' };
    show(documentWith());

    expect(screen.getByRole('button', { name: 'Escalate' })).toBeDisabled();
    await userEvent.hover(
      screen.getByRole('button', { name: 'Escalate' }).parentElement as HTMLElement
    );
    expect(
      await screen.findByText(/The workflow "escalate" has not been saved yet/)
    ).toBeInTheDocument();
  });

  it('asks to know whether the workflow it runs is saved', () => {
    show(documentWith());

    expect(mockRunner.track).toHaveBeenCalledWith(['escalate']);
  });

  it('can be submitted when it runs no workflow, whatever the privileges', async () => {
    mockRunner.availability = { canRun: false, reason: 'You cannot run workflows' };
    const { runtime } = show(
      documentWith({
        fields: [{ bind: 'reason', kind: 'text', label: 'Reason' }],
        onSubmit: [{ type: 'setState', key: 'urgency', value: 'high' }],
      })
    );

    await submit();

    expect(runtime.state$.getValue().urgency).toBe('high');
  });

  it('says what could not be done, as a button does', async () => {
    // A form has no row, so a column cannot be had; validation refuses it, and the runtime would
    // not run it either.
    const node = {
      type: 'form',
      id: 'ask',
      submitLabel: 'Escalate',
      fields: [{ bind: 'reason', kind: 'text', label: 'Reason' }],
      onSubmit: [
        { type: 'runWorkflow', workflow: 'w', inputs: { host: { fromColumn: 'host.name' } } },
      ],
    } as const;
    renderWithRuntime(<NodeRenderer node={node as never} />, documentWith());

    await submit();

    expect(await screen.findByText('Column "host.name" is not in the row')).toBeInTheDocument();
    expect(mockRunner.request).not.toHaveBeenCalled();
  });
});
