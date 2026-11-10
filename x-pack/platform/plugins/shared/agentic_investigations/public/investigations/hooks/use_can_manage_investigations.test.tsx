/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  fetchInvestigationsPrivileges,
  resetInvestigationsPrivilegesCache,
  useCanManageInvestigations,
} from './use_can_manage_investigations';

const NO_ESCALATIONS = { read: false, manage: false };

const renderWithCapabilities = (manageInvestigations: boolean, manage: boolean) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    agenticInvestigations: { manageInvestigations },
  };
  core.http.get.mockResolvedValue({
    investigations: { read: true, manage },
    escalations: NO_ESCALATIONS,
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  return { core, ...renderHook(() => useCanManageInvestigations(), { wrapper }) };
};

describe('useCanManageInvestigations', () => {
  beforeEach(() => resetInvestigationsPrivilegesCache());

  it('trusts the UI capability without asking the API', () => {
    const { core, result } = renderWithCapabilities(true, false);

    expect(result.current).toBe(true);
    expect(core.http.get).not.toHaveBeenCalled();
  });

  it('asks the API when the capability is missing, for users of another feature', async () => {
    const { core, result } = renderWithCapabilities(false, true);

    await waitFor(() => expect(result.current).toBe(true));
    expect(core.http.get).toHaveBeenCalledWith('/internal/investigations/_privileges', {
      version: '1',
    });
  });

  it('stays read-only when the API privilege is missing too', async () => {
    const { core, result } = renderWithCapabilities(false, false);

    await waitFor(() => expect(core.http.get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});

describe('fetchInvestigationsPrivileges', () => {
  beforeEach(() => resetInvestigationsPrivilegesCache());

  it('shares one request across callers', async () => {
    const { http } = coreMock.createStart();
    http.get.mockResolvedValue({ investigations: NO_ESCALATIONS, escalations: NO_ESCALATIONS });

    await Promise.all([fetchInvestigationsPrivileges(http), fetchInvestigationsPrivileges(http)]);

    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('forgets a failed request so the next caller retries', async () => {
    const { http } = coreMock.createStart();
    http.get.mockRejectedValueOnce(new Error('offline'));
    http.get.mockResolvedValueOnce({
      investigations: NO_ESCALATIONS,
      escalations: NO_ESCALATIONS,
    });

    await expect(fetchInvestigationsPrivileges(http)).rejects.toThrow('offline');
    await expect(fetchInvestigationsPrivileges(http)).resolves.toBeDefined();
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
