/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../mock';
import { useAuthz, useGetOneAgentPolicy, useGetOneAgentPolicyFull } from '../hooks';

import { AgentPolicyYamlFlyout } from './agent_policy_yaml_flyout';

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useAuthz: jest.fn(),
  useGetOneAgentPolicy: jest.fn(),
  useGetOneAgentPolicyFull: jest.fn(),
}));
jest.mock('../services', () => ({
  ...jest.requireActual('../services'),
  getYamlFormatters: jest.fn().mockResolvedValue({ fullAgentPolicyToYaml: () => 'yaml' }),
}));

describe('AgentPolicyYamlFlyout', () => {
  const render = (policyId: string) =>
    createFleetTestRendererMock().render(
      <AgentPolicyYamlFlyout policyId={policyId} onClose={jest.fn()} />
    );

  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({ fleet: { readSettings: true } } as any);
    jest.mocked(useGetOneAgentPolicy).mockReturnValue({
      data: { item: { name: 'My policy' } },
    } as any);
    jest.mocked(useGetOneAgentPolicyFull).mockReturnValue({
      isLoading: false,
      data: { item: { id: 'policy-1' } },
    } as any);
  });

  it('shows the agent version of a version specific policy', async () => {
    const results = render('policy-1#9.4');

    expect(await results.findByText(/'My policy' agent policy - v9\.4/)).toBeInTheDocument();
    expect(
      results.baseElement.querySelector('[data-euiicon-type="branch"]') ??
        results.baseElement.querySelector('[type="branch"]')
    ).not.toBeNull();
  });

  it.each(['policy-1#sentinel', 'policy-1'])(
    'does not show a version for the %s policy',
    async (policyId) => {
      const results = render(policyId);

      expect(await results.findByText(/'My policy' agent policy/)).toBeInTheDocument();
      expect(results.baseElement.textContent).not.toMatch(/ - v/);
      expect(results.baseElement.textContent).not.toContain('sentinel');
      expect(
        results.baseElement.querySelector('[data-euiicon-type="branch"]') ??
          results.baseElement.querySelector('[type="branch"]')
      ).toBeNull();
    }
  );
});
