/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../mock';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';

const mockSendGetEnrollmentAPIKeys = jest.fn();

jest.mock('../../applications/fleet/hooks', () => ({
  ...jest.requireActual('../../applications/fleet/hooks'),
  useStartServices: jest.fn().mockReturnValue({
    notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } },
  }),
  sendGetEnrollmentAPIKeys: (...args: unknown[]) => mockSendGetEnrollmentAPIKeys(...args),
}));

const key = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  api_key_id: `${id}-api-key-id`,
  api_key: 'api-key-value',
  name: id,
  active: true,
  policy_id: 'policy-1',
  created_at: '2024-01-01T00:00:00.000Z',
  ...extra,
});

// The selected token is owned by the caller in the flyout, so the test holds it the same way:
// the component only renders the selector once a key has been chosen.
const Harness: React.FunctionComponent<{ onKeyChange: (keyId?: string) => void }> = ({
  onKeyChange,
}) => {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | undefined>();
  const handleKeyChange = useCallback(
    (keyId?: string) => {
      setSelectedApiKeyId(keyId);
      onKeyChange(keyId);
    },
    [onKeyChange]
  );

  return (
    <AdvancedAgentAuthenticationSettings
      agentPolicyId="policy-1"
      selectedApiKeyId={selectedApiKeyId}
      initialAuthenticationSettingsOpen
      onKeyChange={handleKeyChange}
    />
  );
};

describe('AdvancedAgentAuthenticationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not offer a token that has expired', async () => {
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({
      data: {
        items: [
          key('expired-token', {
            expire_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          }),
          key('usable-token'),
        ],
      },
    });
    const onKeyChange = jest.fn();

    const testRenderer = createFleetTestRendererMock();
    const result = testRenderer.render(<Harness onKeyChange={onKeyChange} />);

    await waitFor(() => expect(onKeyChange).toHaveBeenCalledWith('usable-token'));
    expect(result.queryByText('expired-token')).toBeNull();
    expect(result.getByText('usable-token')).toBeInTheDocument();
  });

  it('offers to create a token when the only one for the policy has expired', async () => {
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({
      data: {
        items: [
          key('expired-token', {
            expire_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          }),
        ],
      },
    });

    const testRenderer = createFleetTestRendererMock();
    const result = testRenderer.render(<Harness onKeyChange={jest.fn()} />);

    await waitFor(() =>
      expect(
        result.getByText('There are no enrollment tokens for the selected agent policy')
      ).toBeInTheDocument()
    );
    expect(result.getByText('Create enrollment token')).toBeInTheDocument();
  });
});
