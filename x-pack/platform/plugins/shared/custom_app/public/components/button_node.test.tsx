/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import type { WorkflowRunner } from '../workflows/workflow_runner';
import { NodeRenderer } from './node_renderer';
import { renderWithRuntime } from './test_utils';

const mockRunner: WorkflowRunner = {
  availability: { canRun: true },
  request: jest.fn(),
};
jest.mock('../workflows/workflow_runner', () => ({
  useWorkflowRunner: () => mockRunner,
}));

const documentWith = (onClick: unknown[], extra: unknown[] = []): AppDocument =>
  appDocumentSchema.parse({
    state: { host: { type: 'string', default: 'web-1' } },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'button', id: 'go', label: 'Isolate host', onClick },
        { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
        ...extra,
      ],
    },
  });

const run = {
  type: 'runWorkflow',
  workflow: 'isolate-host',
  inputs: { host: { fromState: 'host' } },
};

const show = (document: AppDocument) => {
  const result = renderWithRuntime(<NodeRenderer node={document.root} />, document);
  return result;
};

describe('the button', () => {
  beforeEach(() => {
    (mockRunner.request as jest.Mock).mockReset();
    mockRunner.availability = { canRun: true };
  });

  it('is shown with what is written on it', () => {
    show(documentWith([]));

    expect(screen.getByRole('button', { name: 'Isolate host' })).toBeEnabled();
  });

  it('asks for the workflow to be run when it is pressed, with what the app holds', async () => {
    show(documentWith([run]));

    await userEvent.click(screen.getByRole('button', { name: 'Isolate host' }));

    expect(mockRunner.request).toHaveBeenCalledWith(
      [{ workflow: 'isolate-host', inputs: { host: 'web-1' } }],
      'go'
    );
  });

  it('does the other things it was asked to as well, at once', async () => {
    const { runtime } = show(documentWith([{ type: 'openFlyout', flyout: 'detail' }, run]));

    await userEvent.click(screen.getByRole('button', { name: 'Isolate host' }));

    expect(runtime.openFlyoutId$.getValue()).toBe('detail');
    expect(mockRunner.request).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing when it runs no workflow', async () => {
    show(documentWith([{ type: 'openFlyout', flyout: 'detail' }]));

    await userEvent.click(screen.getByRole('button', { name: 'Isolate host' }));

    expect(mockRunner.request).not.toHaveBeenCalled();
  });

  describe('when workflows cannot be run', () => {
    beforeEach(() => {
      mockRunner.availability = { canRun: false, reason: 'You need the Execute privilege.' };
    });

    it('cannot be pressed when it runs a workflow', () => {
      show(documentWith([run]));

      expect(screen.getByRole('button', { name: 'Isolate host' })).toBeDisabled();
    });

    it('says why, instead of leaving the person to guess', async () => {
      show(documentWith([run]));

      // A disabled button takes no pointer: the tooltip is on what wraps it, which is what is hovered.
      const wrapper = screen.getByRole('button', { name: 'Isolate host' })
        .parentElement as HTMLElement;
      await userEvent.hover(wrapper);

      expect(await screen.findByText('You need the Execute privilege.')).toBeInTheDocument();
    });

    it('can still be pressed when all it does is something else', async () => {
      const { runtime } = show(documentWith([{ type: 'openFlyout', flyout: 'detail' }]));

      await userEvent.click(screen.getByRole('button', { name: 'Isolate host' }));

      expect(runtime.openFlyoutId$.getValue()).toBe('detail');
    });
  });

  it('says what could not be done, and lets it be dismissed', async () => {
    // A button has no row, so a column cannot be had; validation refuses it, and the runtime
    // would not run it either.
    const node = {
      type: 'button',
      id: 'go',
      label: 'Isolate host',
      onClick: [
        { type: 'runWorkflow', workflow: 'w', inputs: { host: { fromColumn: 'host.name' } } },
      ],
    } as const;
    renderWithRuntime(<NodeRenderer node={node as never} />, documentWith([]));

    await userEvent.click(screen.getByRole('button', { name: 'Isolate host' }));

    expect(await screen.findByText('Column "host.name" is not in the row')).toBeInTheDocument();
    expect(mockRunner.request).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Column "host.name" is not in the row')).not.toBeInTheDocument();
  });
});
