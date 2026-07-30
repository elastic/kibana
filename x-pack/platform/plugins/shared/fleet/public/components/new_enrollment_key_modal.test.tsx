/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../mock';
import type { AgentPolicy } from '../types';

import { NewEnrollmentTokenModal } from './new_enrollment_key_modal';

const mockSendCreateEnrollmentAPIKey = jest.fn().mockResolvedValue({ data: { item: {} } });

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
  }),
  sendCreateEnrollmentAPIKey: (...args: unknown[]) => mockSendCreateEnrollmentAPIKey(...args),
}));

const MOCK_POLICIES = [
  { id: 'normal-policy', name: 'Normal Policy', revision: 1 },
] as AgentPolicy[];

describe('NewEnrollmentTokenModal', () => {
  it('renders the expiration field', () => {
    const testRenderer = createFleetTestRendererMock();
    const results = testRenderer.render(
      <NewEnrollmentTokenModal agentPolicies={MOCK_POLICIES} onClose={jest.fn()} />
    );
    expect(results.getByTestId('createEnrollmentTokenExpirationField')).toBeInTheDocument();
  });

  it.each([
    'notaduration',
    '7D',
    '-1d',
    '1.5d',
    '7',
    '7 d',
    '7days',
    '7w',
    '500ms',
    '100micros',
    '50nanos',
    '0d',
  ])('shows a validation error for invalid expiration "%s"', async (invalidValue) => {
    const testRenderer = createFleetTestRendererMock();
    const results = testRenderer.render(
      <NewEnrollmentTokenModal agentPolicies={MOCK_POLICIES} onClose={jest.fn()} />
    );

    const expirationField = results.getByTestId('createEnrollmentTokenExpirationField');
    await act(async () => {
      fireEvent.change(expirationField, { target: { value: invalidValue } });
    });

    // Submit to trigger validation
    await act(async () => {
      // EuiConfirmModal renders the title and the confirm button with the same text; pick the button
      const confirmButtons = results.getAllByText('Create enrollment token');
      confirmButtons[confirmButtons.length - 1].click();
    });

    await waitFor(() => {
      expect(
        results.getByText('Expiration must be a valid duration (for example, 30d, 24h, 90m, 60s)')
      ).toBeInTheDocument();
    });
  });

  it.each(['7d', '24h', '30m', '60s'])('accepts valid expiration "%s"', async (validValue) => {
    mockSendCreateEnrollmentAPIKey.mockResolvedValue({ data: { item: {} } });
    const testRenderer = createFleetTestRendererMock();
    const results = testRenderer.render(
      <NewEnrollmentTokenModal agentPolicies={MOCK_POLICIES} onClose={jest.fn()} />
    );

    const expirationField = results.getByTestId('createEnrollmentTokenExpirationField');
    await act(async () => {
      fireEvent.change(expirationField, { target: { value: validValue } });
    });

    await act(async () => {
      const confirmButtons = results.getAllByText('Create enrollment token');
      confirmButtons[confirmButtons.length - 1].click();
    });

    await waitFor(() => {
      expect(mockSendCreateEnrollmentAPIKey).toHaveBeenCalledWith(
        expect.objectContaining({ expiration: validValue })
      );
    });
    expect(
      results.queryByText('Expiration must be a valid duration (for example, 30d, 24h, 90m, 60s)')
    ).toBeNull();
  });

  it('includes expiration in the API call when a valid duration is provided', async () => {
    mockSendCreateEnrollmentAPIKey.mockResolvedValue({ data: { item: {} } });
    const testRenderer = createFleetTestRendererMock();
    const results = testRenderer.render(
      <NewEnrollmentTokenModal agentPolicies={MOCK_POLICIES} onClose={jest.fn()} />
    );

    const expirationField = results.getByTestId('createEnrollmentTokenExpirationField');
    await act(async () => {
      fireEvent.change(expirationField, { target: { value: '30d' } });
    });

    await act(async () => {
      // EuiConfirmModal renders the title and the confirm button with the same text; pick the button
      const confirmButtons = results.getAllByText('Create enrollment token');
      confirmButtons[confirmButtons.length - 1].click();
    });

    await waitFor(() => {
      expect(mockSendCreateEnrollmentAPIKey).toHaveBeenCalledWith(
        expect.objectContaining({ expiration: '30d' })
      );
    });
  });

  it('does not include expiration in the API call when left empty', async () => {
    mockSendCreateEnrollmentAPIKey.mockResolvedValue({ data: { item: {} } });
    const testRenderer = createFleetTestRendererMock();
    const results = testRenderer.render(
      <NewEnrollmentTokenModal agentPolicies={MOCK_POLICIES} onClose={jest.fn()} />
    );

    await act(async () => {
      // EuiConfirmModal renders the title and the confirm button with the same text; pick the button
      const confirmButtons = results.getAllByText('Create enrollment token');
      confirmButtons[confirmButtons.length - 1].click();
    });

    await waitFor(() => {
      expect(mockSendCreateEnrollmentAPIKey).toHaveBeenCalledWith(
        expect.not.objectContaining({ expiration: expect.anything() })
      );
    });
  });

});
