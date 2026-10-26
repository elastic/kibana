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
import { resetInvestigationsPrivilegesCache } from '../../investigations/hooks/use_can_manage_investigations';
import { useCanManageEscalations, useCanReadEscalations } from './use_escalation_privileges';

const render = (
  hook: () => boolean,
  capabilities: Record<string, boolean>,
  escalations: { read: boolean; manage: boolean }
) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    agenticInvestigations: capabilities,
  };
  core.http.get.mockResolvedValue({
    investigations: { read: false, manage: false },
    escalations,
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  return { core, ...renderHook(hook, { wrapper }) };
};

describe.each([
  ['useCanManageEscalations', useCanManageEscalations, 'manageEscalations', 'manage'],
  ['useCanReadEscalations', useCanReadEscalations, 'showEscalations', 'read'],
] as const)('%s', (_name, hook, capability, privilege) => {
  beforeEach(() => resetInvestigationsPrivilegesCache());

  it('trusts the UI capability without asking the API', () => {
    const { core, result } = render(hook, { [capability]: true }, { read: false, manage: false });

    expect(result.current).toBe(true);
    expect(core.http.get).not.toHaveBeenCalled();
  });

  it('asks the API when the capability is missing', async () => {
    const { result } = render(hook, {}, { read: false, manage: false, [privilege]: true });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays false when the API privilege is missing too', async () => {
    const { core, result } = render(hook, {}, { read: false, manage: false });

    await waitFor(() => expect(core.http.get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
