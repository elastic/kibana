/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { ConfirmChangeTemplateModal } from './confirm_change_template_modal';
import { renderWithTestingProviders } from '../../../../../common/mock';

const oldTemplate = {
  name: 'Security Template',
  fieldNames: [{ name: 'priority', label: 'Priority' }],
};

const newTemplate = {
  name: 'Observability Template',
  fieldNames: [{ name: 'severity', label: 'Severity' }],
};

describe('ConfirmChangeTemplateModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
  });

  it('renders the modal title', () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={oldTemplate}
        newTemplate={newTemplate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Change template')).toBeInTheDocument();
  });

  it('asks to change from the old template to the new template when both are provided', () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={oldTemplate}
        newTemplate={newTemplate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/Are you sure you want to change from/)).toBeInTheDocument();
    expect(screen.getByText(oldTemplate.name)).toBeInTheDocument();
    expect(screen.getByText(newTemplate.name)).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toHaveTextContent('Change');
  });

  it('asks to apply the new template when there is no old template', () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        newTemplate={newTemplate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/Are you sure you want to apply/)).toBeInTheDocument();
    expect(screen.getByText(newTemplate.name)).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toHaveTextContent('Apply');
  });

  it('asks to remove the old template when there is no new template', () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={oldTemplate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
    expect(screen.getByText(oldTemplate.name)).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toHaveTextContent('Remove');
  });

  it('shows a tooltip with the template fields when hovering the list icon', async () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={oldTemplate}
        newTemplate={newTemplate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const icons = screen.getAllByTestId('confirm-change-template-modal-fields-icon');
    await user.click(icons[1]);

    await waitFor(() => {
      expect(
        screen.getByTestId('confirm-change-template-modal-fields-tooltip')
      ).toBeInTheDocument();
    });
    expect(screen.getByText(newTemplate.fieldNames[0].label)).toBeInTheDocument();
  });

  it('does not render a fields icon when a template has no fields', () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={{ name: 'Empty Template' }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(
      screen.queryByTestId('confirm-change-template-modal-fields-icon')
    ).not.toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={oldTemplate}
        newTemplate={newTemplate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={oldTemplate}
        newTemplate={newTemplate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByTestId('confirmModalCancelButton'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables the confirm button when isConfirmDisabled is true', () => {
    renderWithTestingProviders(
      <ConfirmChangeTemplateModal
        oldTemplate={oldTemplate}
        newTemplate={newTemplate}
        isConfirmDisabled
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();
  });
});
