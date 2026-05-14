/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { InboxAction } from '@kbn/inbox-common';
import { RespondFlyout } from './respond_flyout';

// --- Mocks -------------------------------------------------------------------

jest.mock('../../../hooks/use_respond_to_inbox_action', () => ({
  useRespondToInboxAction: jest.fn(),
}));

jest.mock('../../../hooks/use_action_detail_renderer', () => ({
  useActionDetailRenderer: jest.fn().mockReturnValue(null),
}));

import { useRespondToInboxAction } from '../../../hooks/use_respond_to_inbox_action';

const mockUseRespondToInboxAction = useRespondToInboxAction as jest.MockedFunction<
  typeof useRespondToInboxAction
>;

// --- Fixtures ----------------------------------------------------------------

const SCHEMA = {
  properties: {
    approved: { default: true, title: 'Approved', type: 'boolean' as const },
    reason: { required: true, title: 'Reason', type: 'string' as const },
  },
  required: ['reason'],
  type: 'object' as const,
};

const makeAction = (overrides: Partial<InboxAction> = {}): InboxAction => ({
  created_at: '2026-01-01T00:00:00.000Z',
  id: 'action-1',
  input_message: 'Please review the request.',
  input_schema: SCHEMA as any,
  responded_at: undefined,
  response_mode: 'pending' as any,
  source_app: 'workflows',
  source_id: 'exec-1',
  status: 'pending' as any,
  title: 'Test Action',
  ...overrides,
});

const makeMutation = (overrides: Partial<ReturnType<typeof useRespondToInboxAction>> = {}) =>
  ({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useRespondToInboxAction>);

const renderFlyout = (
  props: Partial<React.ComponentProps<typeof RespondFlyout>> = {},
  mutation?: ReturnType<typeof makeMutation>
) => {
  const action = makeAction();
  const onClose = jest.fn();
  const onSuccess = jest.fn();
  mockUseRespondToInboxAction.mockReturnValue(mutation ?? makeMutation());

  render(
    <IntlProvider locale="en">
      <RespondFlyout action={action} onClose={onClose} onSuccess={onSuccess} {...props} />
    </IntlProvider>
  );

  return { action, onClose, onSuccess };
};

// --- Tests -------------------------------------------------------------------

describe('RespondFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the action title', () => {
    renderFlyout();

    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('renders the input message', () => {
    renderFlyout();

    expect(screen.getByText('Please review the request.')).toBeInTheDocument();
  });

  it('seeds form with schema defaults (approved=true toggle pre-checked)', () => {
    renderFlyout();

    // EuiSwitch renders as <button role="switch" aria-checked>, not an <input>
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('blocks submission when required fields are empty', async () => {
    const mutation = makeMutation();

    renderFlyout({}, mutation);

    // The 'reason' field is required and empty — click Submit without filling it
    fireEvent.click(screen.getByText('Submit'));

    expect(mutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('calls mutateAsync with source_app, source_id, and form values on valid submit', async () => {
    const mutation = makeMutation();

    renderFlyout({}, mutation);

    fireEvent.change(screen.getByRole('textbox', { name: /reason/i }), {
      target: { value: 'all looks good' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'));
    });

    await waitFor(() => {
      expect(mutation.mutateAsync).toHaveBeenCalledWith({
        sourceApp: 'workflows',
        sourceId: 'exec-1',
        input: expect.objectContaining({ reason: 'all looks good' }),
      });
    });
  });

  it('calls onSuccess and onClose after successful submission', async () => {
    const mutation = makeMutation({ mutateAsync: jest.fn().mockResolvedValue({}) });
    mockUseRespondToInboxAction.mockReturnValue(mutation);

    const onClose = jest.fn();
    const onSuccess = jest.fn();

    render(
      <IntlProvider locale="en">
        <RespondFlyout action={makeAction()} onClose={onClose} onSuccess={onSuccess} />
      </IntlProvider>
    );

    fireEvent.change(screen.getByRole('textbox', { name: /reason/i }), {
      target: { value: 'done' },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'));
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('disables submit when action is timed out', () => {
    renderFlyout({ action: makeAction({ response_mode: 'timed_out' as any }) });

    expect(screen.getByText('Submit').closest('button')).toBeDisabled();
  });

  it('shows a timed-out banner when action is timed out', () => {
    renderFlyout({ action: makeAction({ response_mode: 'timed_out' as any }) });

    // The timed-out callout should appear; check for the EuiCallOut
    expect(document.querySelector('.euiCallOut')).toBeTruthy();
  });
});
