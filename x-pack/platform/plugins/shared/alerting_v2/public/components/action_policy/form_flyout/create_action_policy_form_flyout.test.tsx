/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ActionPolicyFormState } from '../form/types';
import { CreateActionPolicyFormFlyout } from './create_action_policy_form_flyout';

const mockCreatePolicy = jest.fn();
const mockCreateInlineWorkflows = jest.fn();
const mockRollbackWorkflows = jest.fn();
const mockAddError = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: () => ({ toasts: { addError: mockAddError } }),
}));

jest.mock('../../../hooks/use_create_action_policy', () => ({
  useCreateActionPolicy: () => ({ mutateAsync: mockCreatePolicy, isLoading: false }),
}));

jest.mock('../../../hooks/use_create_inline_workflows', () => ({
  useCreateInlineWorkflows: () => ({
    createInlineWorkflows: mockCreateInlineWorkflows,
    rollbackWorkflows: mockRollbackWorkflows,
  }),
}));

const formValues: ActionPolicyFormState = {
  name: 'Created from rule',
  description: '',
  matcher: null,
  groupingMode: 'per_episode',
  groupBy: [],
  throttleStrategy: 'on_status_change',
  throttleInterval: '',
  destinations: [],
  inlineActions: [
    {
      id: 'inline-1',
      source: 'inline',
      stepType: 'email',
      connectorId: 'connector-1',
      params: 'to: ops@example.com',
    },
  ],
};

jest.mock('./action_policy_form_flyout', () => ({
  ActionPolicyFormFlyout: ({
    onSave,
  }: {
    onSave: (values: ActionPolicyFormState) => Promise<void>;
  }) => (
    <button type="button" onClick={() => onSave(formValues)}>
      Submit
    </button>
  ),
}));

describe('CreateActionPolicyFormFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateInlineWorkflows.mockResolvedValue(['workflow-1']);
    mockCreatePolicy.mockResolvedValue({});
  });

  it('creates inline workflows and the action policy before reporting success', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();

    render(<CreateActionPolicyFormFlyout onClose={jest.fn()} onSuccess={onSuccess} />);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockCreateInlineWorkflows).toHaveBeenCalledWith(formValues.inlineActions);
    expect(mockCreatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Created from rule',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      })
    );
  });

  it('rolls back newly created workflows when action policy creation fails', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    mockCreatePolicy.mockRejectedValue(new Error('create failed'));

    render(<CreateActionPolicyFormFlyout onClose={jest.fn()} onSuccess={onSuccess} />);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(mockRollbackWorkflows).toHaveBeenCalledWith(['workflow-1']));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
