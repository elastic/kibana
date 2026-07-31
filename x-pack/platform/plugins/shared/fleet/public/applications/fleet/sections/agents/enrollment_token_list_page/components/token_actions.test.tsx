/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, within } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { EnrollmentAPIKey } from '../../../../types';

import { TokenActions } from './token_actions';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockSendDeleteOneEnrollmentAPIKey = jest.fn();

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: (...args: unknown[]) => mockAddSuccess(...args),
        addError: (...args: unknown[]) => mockAddError(...args),
      },
    },
  }),
  sendDeleteOneEnrollmentAPIKey: (...args: unknown[]) => mockSendDeleteOneEnrollmentAPIKey(...args),
}));

const MOCK_API_KEY: EnrollmentAPIKey = {
  id: 'key-1',
  api_key_id: 'api-key-id-1',
  api_key: 'api-key-value',
  name: 'Test token',
  active: true,
  policy_id: 'policy-1',
  created_at: '2024-01-01T00:00:00.000Z',
};

type RenderResult = ReturnType<ReturnType<typeof createFleetTestRendererMock>['render']>;

async function openMenuAndClickItem(result: RenderResult, itemTestSubj: string) {
  const scope = within(result.baseElement);
  await act(async () => {
    scope.getByTestId('enrollmentTokenTable.actionsMenu').click();
  });
  await act(async () => {
    scope.getByTestId(itemTestSubj).click();
  });
}

async function clickConfirmButton(result: RenderResult) {
  const scope = within(result.baseElement);
  await act(async () => {
    scope.getByTestId('confirmModalConfirmButton').click();
  });
}

describe('TokenActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a success toast after revoking a token', async () => {
    mockSendDeleteOneEnrollmentAPIKey.mockResolvedValue({ data: {} });
    const refresh = jest.fn();
    const testRenderer = createFleetTestRendererMock();
    const result = testRenderer.render(<TokenActions apiKey={MOCK_API_KEY} refresh={refresh} />);

    await openMenuAndClickItem(result, 'enrollmentTokenTable.revokeBtn');
    await clickConfirmButton(result);

    await waitFor(() => {
      expect(mockSendDeleteOneEnrollmentAPIKey).toHaveBeenCalledWith(MOCK_API_KEY.id);
      expect(mockAddSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Enrollment token revoked')
      );
      expect(mockAddError).not.toHaveBeenCalled();
      expect(refresh).toHaveBeenCalled();
    });
  });

  it('shows a success toast after deleting a token', async () => {
    mockSendDeleteOneEnrollmentAPIKey.mockResolvedValue({ data: {} });
    const refresh = jest.fn();
    const testRenderer = createFleetTestRendererMock();
    const result = testRenderer.render(<TokenActions apiKey={MOCK_API_KEY} refresh={refresh} />);

    await openMenuAndClickItem(result, 'enrollmentTokenTable.deleteBtn');
    await clickConfirmButton(result);

    await waitFor(() => {
      expect(mockSendDeleteOneEnrollmentAPIKey).toHaveBeenCalledWith(MOCK_API_KEY.id, {
        forceDelete: true,
      });
      expect(mockAddSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Enrollment token successfully deleted')
      );
      expect(mockAddError).not.toHaveBeenCalled();
      expect(refresh).toHaveBeenCalled();
    });
  });

  it('shows an error toast and no success toast when the API call fails', async () => {
    const apiError = new Error('API error');
    mockSendDeleteOneEnrollmentAPIKey.mockResolvedValue({ error: apiError });
    const refresh = jest.fn();
    const testRenderer = createFleetTestRendererMock();
    const result = testRenderer.render(<TokenActions apiKey={MOCK_API_KEY} refresh={refresh} />);

    await openMenuAndClickItem(result, 'enrollmentTokenTable.revokeBtn');
    await clickConfirmButton(result);

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
      // refresh still runs on error — the table re-fetches to show current state
      expect(refresh).toHaveBeenCalled();
    });
  });

  it('calls refresh on the success path', async () => {
    mockSendDeleteOneEnrollmentAPIKey.mockResolvedValue({ data: {} });
    const refresh = jest.fn();
    const testRenderer = createFleetTestRendererMock();
    const result = testRenderer.render(<TokenActions apiKey={MOCK_API_KEY} refresh={refresh} />);
    await openMenuAndClickItem(result, 'enrollmentTokenTable.revokeBtn');
    await clickConfirmButton(result);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('calls refresh on the error path', async () => {
    mockSendDeleteOneEnrollmentAPIKey.mockResolvedValue({ error: new Error('fail') });
    const refresh = jest.fn();
    const testRenderer = createFleetTestRendererMock();
    const result = testRenderer.render(<TokenActions apiKey={MOCK_API_KEY} refresh={refresh} />);
    await openMenuAndClickItem(result, 'enrollmentTokenTable.revokeBtn');
    await clickConfirmButton(result);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
