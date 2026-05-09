/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormWrapper } from '../../test_utils';
import { AttachmentRunbookFieldGroup } from './attachment_runbook_field_group';

const getRunbookModal = () => {
  const heading = screen.getByRole('heading', { name: 'Add Runbook' });
  const modal = heading.closest('[role="dialog"]');

  if (!modal) {
    throw new Error('Runbook modal container not found');
  }

  return modal as HTMLElement;
};

const openAttachmentsSection = async () => {
  const isContentVisible =
    !!screen.queryByTestId('addRunbookButton') ||
    !!screen.queryByLabelText('Edit Runbook') ||
    !!screen.queryByLabelText('Delete Runbook');

  if (!isContentVisible) {
    await userEvent.click(screen.getByRole('button', { name: 'Toggle Attachments' }));
  }
};

const addRunbookText = async (text: string) => {
  const user = userEvent.setup();

  await openAttachmentsSection();
  await user.click(screen.getByTestId('addRunbookButton'));

  const modal = getRunbookModal();
  const editor = within(modal).getByLabelText('Runbook');
  await user.type(editor, text);
  await user.click(within(modal).getByRole('button', { name: 'Add Runbook' }));
};

describe('AttachmentRunbookFieldGroup', () => {
  it('renders attachments title and keeps section closed initially', () => {
    render(<AttachmentRunbookFieldGroup />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Attachments')).toBeInTheDocument();
    expect(screen.queryByTestId('addRunbookButton')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit Runbook')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete Runbook')).not.toBeInTheDocument();
  });

  it('opens and closes runbook modal from add button', async () => {
    const user = userEvent.setup();
    render(<AttachmentRunbookFieldGroup />, { wrapper: createFormWrapper() });

    await openAttachmentsSection();
    await user.click(screen.getByTestId('addRunbookButton'));
    expect(screen.getByRole('heading', { name: 'Add Runbook' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Add Runbook' })).not.toBeInTheDocument();
  });

  it('saves runbook, hides add button, and shows panel with first line title', async () => {
    render(<AttachmentRunbookFieldGroup />, { wrapper: createFormWrapper() });

    await addRunbookText('First line title\nSecond line');

    expect(screen.queryByTestId('addRunbookButton')).not.toBeInTheDocument();
    expect(screen.getByText('Runbook')).toBeInTheDocument();
    expect(screen.getByText('First line title')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Runbook')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete Runbook')).toBeInTheDocument();
  });

  it('reopens modal from edit and keeps existing runbook value', async () => {
    const user = userEvent.setup();
    render(<AttachmentRunbookFieldGroup />, { wrapper: createFormWrapper() });

    await addRunbookText('Existing runbook title');
    await user.click(screen.getByLabelText('Edit Runbook'));

    const modal = getRunbookModal();
    expect(within(modal).getByLabelText('Runbook')).toHaveValue('Existing runbook title');
  });

  it('shows delete confirmation and keeps runbook when delete is canceled', async () => {
    const user = userEvent.setup();
    render(<AttachmentRunbookFieldGroup />, { wrapper: createFormWrapper() });

    await addRunbookText('Runbook to keep');
    await user.click(screen.getByLabelText('Delete Runbook'));

    expect(screen.getByText('Are you sure you want to delete a runbook?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Runbook to keep')).toBeInTheDocument();
    expect(screen.queryByTestId('addRunbookButton')).not.toBeInTheDocument();
  });

  it('deletes runbook after confirmation and shows add runbook button again', async () => {
    const user = userEvent.setup();
    render(<AttachmentRunbookFieldGroup />, { wrapper: createFormWrapper() });

    await addRunbookText('Runbook to delete');
    await user.click(screen.getByLabelText('Delete Runbook'));
    await user.click(screen.getByRole('button', { name: 'Delete runbook' }));

    expect(screen.queryByText('Runbook to delete')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit Runbook')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete Runbook')).not.toBeInTheDocument();
    expect(screen.getByTestId('addRunbookButton')).toBeInTheDocument();
  });
});
