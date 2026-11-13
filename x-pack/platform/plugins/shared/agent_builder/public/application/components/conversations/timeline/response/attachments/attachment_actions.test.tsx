/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActionButtonType, type ActionButton } from '@kbn/agent-builder-browser/attachments';
import { AttachmentActions } from './attachment_actions';

function makeDeferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const createButton = (overrides: Partial<ActionButton> & Pick<ActionButton, 'label'>) => ({
  type: ActionButtonType.SECONDARY,
  handler: jest.fn(),
  ...overrides,
});

const openMenu = () => fireEvent.click(screen.getByTestId('agentBuilderAttachmentMoreActions'));

describe('AttachmentActions', () => {
  it('renders nothing without actions', () => {
    const { container } = render(<AttachmentActions buttons={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the main button when there are no other actions', () => {
    const copy = createButton({ label: 'Copy', type: ActionButtonType.PRIMARY });
    render(<AttachmentActions buttons={[copy]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(copy.handler).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('agentBuilderAttachmentMoreActions')).not.toBeInTheDocument();
  });

  it('uses the primary action as the main button and puts secondary and overflow actions in the menu', async () => {
    const run = createButton({ label: 'Run', type: ActionButtonType.PRIMARY });
    const copy = createButton({ label: 'Copy', type: ActionButtonType.SECONDARY });
    const remove = createButton({ label: 'Delete', type: ActionButtonType.SECONDARY });
    render(<AttachmentActions buttons={[copy, run, remove]} />);

    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();

    openMenu();
    expect(await screen.findByText('Copy')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));

    expect(remove.handler).toHaveBeenCalledTimes(1);
    expect(run.handler).not.toHaveBeenCalled();
    expect(copy.handler).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Delete')).not.toBeInTheDocument());
  });

  it('uses the first primary as the main button and moves further primaries to the menu', async () => {
    const edit = createButton({ label: 'Edit', type: ActionButtonType.PRIMARY });
    const save = createButton({ label: 'Save', type: ActionButtonType.PRIMARY });
    render(<AttachmentActions buttons={[edit, save]} />);

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();

    openMenu();
    fireEvent.click(await screen.findByText('Save'));

    expect(save.handler).toHaveBeenCalledTimes(1);
  });

  it('uses the first secondary action as the main button when there is no primary action', async () => {
    const preview = createButton({ label: 'Preview' });
    const openInEditor = createButton({ label: 'Open in editor' });
    render(<AttachmentActions buttons={[preview, openInEditor]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(preview.handler).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Open in editor')).not.toBeInTheDocument();

    openMenu();
    fireEvent.click(await screen.findByText('Open in editor'));

    expect(openInEditor.handler).toHaveBeenCalledTimes(1);
  });

  it('uses the first secondary action as the main button when there are multiple secondary actions', async () => {
    const remove = createButton({ label: 'Delete', type: ActionButtonType.SECONDARY });
    const archive = createButton({ label: 'Archive', type: ActionButtonType.SECONDARY });
    render(<AttachmentActions buttons={[remove, archive]} />);

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    openMenu();
    fireEvent.click(await screen.findByText('Archive'));

    expect(archive.handler).toHaveBeenCalledTimes(1);
  });

  it('shows a lone non-primary action as a regular button', () => {
    const preview = createButton({ label: 'Preview' });
    render(<AttachmentActions buttons={[preview]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(preview.handler).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('agentBuilderAttachmentMoreActions')).not.toBeInTheDocument();
  });

  it('does not run a disabled main button', () => {
    const save = createButton({
      label: 'Save',
      type: ActionButtonType.PRIMARY,
      disabled: true,
      disabledReason: 'Missing privileges',
    });
    render(<AttachmentActions buttons={[save]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(save.handler).not.toHaveBeenCalled();
  });

  it('keeps a disabled main button of a split button focusable and does not run it', () => {
    const save = createButton({
      label: 'Save',
      type: ActionButtonType.PRIMARY,
      disabled: true,
      disabledReason: 'Missing privileges',
    });
    render(<AttachmentActions buttons={[save, createButton({ label: 'Copy' })]} />);

    const main = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(main);

    expect(main).toHaveAttribute('aria-disabled', 'true');
    expect(main).not.toBeDisabled();
    expect(save.handler).not.toHaveBeenCalled();
  });

  it('keeps the menu usable when the main button is disabled', async () => {
    const save = createButton({
      label: 'Save',
      type: ActionButtonType.PRIMARY,
      disabled: true,
      disabledReason: 'Missing privileges',
    });
    const copy = createButton({ label: 'Copy' });
    render(<AttachmentActions buttons={[save, copy]} />);

    openMenu();
    fireEvent.click(await screen.findByText('Copy'));

    expect(copy.handler).toHaveBeenCalledTimes(1);
  });

  it('keeps the menu usable when the main button is disabled without a reason', async () => {
    const save = createButton({ label: 'Save', type: ActionButtonType.PRIMARY, disabled: true });
    const copy = createButton({ label: 'Copy' });
    render(<AttachmentActions buttons={[save, copy]} />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByTestId('agentBuilderAttachmentMoreActions')).toBeEnabled();

    openMenu();
    fireEvent.click(await screen.findByText('Copy'));

    expect(copy.handler).toHaveBeenCalledTimes(1);
  });

  it('renders the main button as a link when it has an href', () => {
    const open = createButton({
      label: 'Open',
      type: ActionButtonType.PRIMARY,
      href: 'https://example.com',
      openInNewTab: true,
    });
    render(<AttachmentActions buttons={[open]} />);

    const link = screen.getByRole('link', { name: 'Open' });

    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps the link of a main button that is part of a split button', async () => {
    const open = createButton({
      label: 'Open',
      type: ActionButtonType.PRIMARY,
      href: 'https://example.com',
      openInNewTab: true,
    });
    const docs = createButton({ label: 'Docs', href: 'https://example.com/docs' });
    render(<AttachmentActions buttons={[open, docs]} />);

    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      'https://example.com'
    );

    openMenu();

    expect((await screen.findByText('Docs')).closest('a')).toHaveAttribute(
      'href',
      'https://example.com/docs'
    );
  });

  it('renders the main button as an icon only in compact mode, keeping its label accessible', () => {
    const run = createButton({ label: 'Run', icon: 'play', type: ActionButtonType.PRIMARY });
    render(<AttachmentActions buttons={[run]} iconOnly />);

    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
    expect(screen.queryByText('Run')).not.toBeInTheDocument();
  });

  it('keeps the label of a main button without an icon in compact mode', () => {
    const run = createButton({ label: 'Run', type: ActionButtonType.PRIMARY });
    render(<AttachmentActions buttons={[run]} iconOnly />);

    expect(screen.getByText('Run')).toBeInTheDocument();
  });

  describe('async loading lifecycle', () => {
    it('disables the main button while its handler promise is pending, re-enables on resolve', async () => {
      const { promise, resolve } = makeDeferred();
      const handler = jest.fn(() => promise);
      const copy = createButton({ label: 'Create', type: ActionButtonType.PRIMARY, handler });
      render(<AttachmentActions buttons={[copy]} />);

      const btn = screen.getByRole('button', { name: 'Create' });
      expect(btn).not.toBeDisabled();

      fireEvent.click(btn);

      expect(btn).toBeDisabled();
      expect(handler).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolve();
        await promise;
      });

      expect(btn).not.toBeDisabled();
    });

    it('re-enables the main button when the handler rejects', async () => {
      const { promise, reject } = makeDeferred();
      const handler = jest.fn(() => promise);
      const save = createButton({ label: 'Save', type: ActionButtonType.PRIMARY, handler });
      render(<AttachmentActions buttons={[save]} />);

      const btn = screen.getByRole('button', { name: 'Save' });
      fireEvent.click(btn);

      expect(btn).toBeDisabled();

      await act(async () => {
        reject(new Error('network error'));
        await promise.catch(() => {});
      });

      expect(btn).not.toBeDisabled();
    });

    it('prevents double submission by disabling the button after the first click', async () => {
      const { promise, resolve } = makeDeferred();
      const handler = jest.fn(() => promise);
      const save = createButton({ label: 'Submit', type: ActionButtonType.PRIMARY, handler });
      render(<AttachmentActions buttons={[save]} />);

      const btn = screen.getByRole('button', { name: 'Submit' });
      fireEvent.click(btn);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(btn).toBeDisabled();

      await act(async () => {
        resolve();
        await promise;
      });
    });

    it('disables the split-button dropdown trigger while the main handler is pending', async () => {
      const { promise, resolve } = makeDeferred();
      const handler = jest.fn(() => promise);
      const primary = createButton({ label: 'Create', type: ActionButtonType.PRIMARY, handler });
      const secondary = createButton({ label: 'Copy' });
      render(<AttachmentActions buttons={[primary, secondary]} />);

      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      expect(screen.getByTestId('agentBuilderAttachmentMoreActions')).toBeDisabled();

      await act(async () => {
        resolve();
        await promise;
      });

      expect(screen.getByTestId('agentBuilderAttachmentMoreActions')).not.toBeDisabled();
    });

    it('disables menu items while the main handler is pending', async () => {
      const { promise, resolve } = makeDeferred();
      const handler = jest.fn(() => promise);
      const primary = createButton({ label: 'Create', type: ActionButtonType.PRIMARY, handler });
      const secondary = createButton({ label: 'Copy' });
      render(<AttachmentActions buttons={[primary, secondary]} />);

      // Open the menu while idle, then start loading — the popover stays open
      openMenu();
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      const menuItem = await screen.findByText('Copy');
      expect(menuItem.closest('button, [role="menuitem"]')).toBeDisabled();

      await act(async () => {
        resolve();
        await promise;
      });
    });
  });
});
