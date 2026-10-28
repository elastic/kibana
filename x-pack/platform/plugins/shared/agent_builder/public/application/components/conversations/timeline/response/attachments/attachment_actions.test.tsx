/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActionButtonType, type ActionButton } from '@kbn/agent-builder-browser/attachments';
import { AttachmentActions } from './attachment_actions';

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
    const remove = createButton({ label: 'Delete', type: ActionButtonType.OVERFLOW });
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

  it('renders a menu-only button when there is no primary action and several actions', async () => {
    const copy = createButton({ label: 'Copy' });
    const remove = createButton({ label: 'Delete', type: ActionButtonType.OVERFLOW });
    render(<AttachmentActions buttons={[copy, remove]} />);

    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();

    openMenu();
    fireEvent.click(await screen.findByText('Copy'));

    expect(copy.handler).toHaveBeenCalledTimes(1);
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
});
