/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { NotificationPolicyFormFlyout } from './notification_policy_form_flyout';

const TEST_SUBJ = {
  title: 'title',
  cancelButton: 'cancelButton',
  submitButton: 'submitButton',
  nameInput: 'nameInput',
  descriptionInput: 'descriptionInput',
} as const;

const renderFlyout = ({
  onClose = jest.fn(),
  onSave,
  onUpdate,
  initialValues,
}: {
  onClose?: jest.Mock;
  onSave?: jest.Mock;
  onUpdate?: jest.Mock;
  initialValues?: NotificationPolicyResponse;
}) => {
  return render(
    <I18nProvider>
      <NotificationPolicyFormFlyout
        onClose={onClose}
        onSave={onSave}
        onUpdate={onUpdate}
        initialValues={initialValues}
      />
    </I18nProvider>
  );
};

describe('NotificationPolicyFormFlyout', () => {
  it('renders create mode and closes on cancel', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    renderFlyout({ onClose, onSave: jest.fn() });

    expect(screen.getByTestId(TEST_SUBJ.title)).toHaveTextContent('Create notification policy');
    expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Save');

    await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits create payload and omits optional empty fields', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    renderFlyout({ onClose: jest.fn(), onSave });

    await user.type(screen.getByTestId(TEST_SUBJ.nameInput), 'Policy from test');
    await user.tab();
    await user.type(screen.getByTestId(TEST_SUBJ.descriptionInput), 'Description from test');
    await user.tab();

    const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: 'Policy from test',
      description: 'Description from test',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
  });

  it('renders edit mode and submits update payload with optional fields and version', async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn();
    const initialValues: NotificationPolicyResponse = {
      id: 'policy-1',
      version: 'WzEsMV0=',
      name: 'Critical production alerts',
      description: 'Routes critical alerts',
      enabled: true,
      matcher: 'data.severity : "critical"',
      group_by: ['host.name', 'service.name'],
      throttle: { interval: '5m' },
      destinations: [{ type: 'workflow', id: 'workflow-2' }],
      createdBy: 'elastic',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedBy: 'elastic',
      updatedAt: '2026-03-01T10:00:00.000Z',
      auth: {
        owner: 'elastic',
        createdByUser: true,
      },
    };

    renderFlyout({ onClose: jest.fn(), onUpdate, initialValues });

    expect(screen.getByTestId(TEST_SUBJ.title)).toHaveTextContent('Edit notification policy');
    expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Update');

    await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
    await user.tab();
    await user.click(screen.getByTestId(TEST_SUBJ.descriptionInput));
    await user.tab();

    const updateButton = screen.getByTestId(TEST_SUBJ.submitButton);
    await waitFor(() => expect(updateButton).toBeEnabled());
    await user.click(updateButton);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('policy-1', {
      version: 'WzEsMV0=',
      name: 'Critical production alerts',
      description: 'Routes critical alerts',
      matcher: 'data.severity : "critical"',
      group_by: ['host.name', 'service.name'],
      throttle: { interval: '5m' },
      destinations: [{ type: 'workflow', id: 'workflow-2' }],
    });
  });
});
