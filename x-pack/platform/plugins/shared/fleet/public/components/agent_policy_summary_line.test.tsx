/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TestRenderer } from '../mock';
import { createFleetTestRendererMock } from '../mock';

import type { AgentPolicy, Agent } from '../types';

import { AgentPolicySummaryLine } from './agent_policy_summary_line';

describe('AgentPolicySummaryLine', () => {
  let testRenderer: TestRenderer;

  const render = (agentPolicy: AgentPolicy, agent?: Agent) =>
    testRenderer.render(<AgentPolicySummaryLine policy={agentPolicy} agent={agent} />);

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  test('it should render policy and revision if no agent is provided', async () => {
    const results = render({ name: 'test', revision: 2 } as AgentPolicy);
    expect(results.container.textContent).toBe('testrev. 2');
  });

  test('it should render policy without revision if the agent do not have revision', async () => {
    const results = render({ name: 'test', revision: 1 } as AgentPolicy, {} as Agent);
    expect(results.container.textContent).toBe('test');
  });

  test('it should render policy with agent revision if an agent is provided', async () => {
    const results = render(
      { name: 'test', revision: 2 } as AgentPolicy,
      { policy_revision: 2 } as Agent
    );
    expect(results.container.textContent).toBe('testrev. 2');
  });

  test('it should render policy with agent revision with outdated callout if agent revision is less than policy', async () => {
    const results = render(
      { name: 'test', revision: 2 } as AgentPolicy,
      { policy_revision: 1 } as Agent
    );
    expect(results.container.textContent).toBe('testrev. 1Outdated policy');
  });

  test('it should render incompatible integrations warning when agent version does not satisfy policy condition', async () => {
    const policy = {
      name: 'test',
      revision: 2,
      min_agent_version: '9.3.0',
      package_agent_version_conditions: [
        { name: 'auth0', title: 'Auth0', version_condition: '^9.3.0' },
      ],
    } as AgentPolicy;
    const agent = {
      policy_revision: 2,
      local_metadata: { elastic: { agent: { version: '8.18.0' } } },
    } as unknown as Agent;

    const results = render(policy, agent);
    expect(results.container.textContent).toContain('Incompatible integrations');
    expect(results.container.textContent).not.toContain('warnings');
  });

  test('it should not render incompatible integrations warning when agent version satisfies policy condition', async () => {
    const policy = {
      name: 'test',
      revision: 2,
      min_agent_version: '9.3.0',
      package_agent_version_conditions: [
        { name: 'auth0', title: 'Auth0', version_condition: '^9.3.0' },
      ],
    } as AgentPolicy;
    const agent = {
      policy_revision: 2,
      local_metadata: { elastic: { agent: { version: '9.3.0' } } },
    } as unknown as Agent;

    const results = render(policy, agent);
    expect(results.container.textContent).not.toContain('Incompatible integrations');
    expect(results.container.textContent).not.toContain('warnings');
  });

  test('it should render "N warnings" summary when agent is both outdated and has incompatible integrations', async () => {
    const policy = {
      name: 'test',
      revision: 2,
      min_agent_version: '9.3.0',
      package_agent_version_conditions: [
        { name: 'auth0', title: 'Auth0', version_condition: '^9.3.0' },
      ],
    } as AgentPolicy;
    const agent = {
      policy_revision: 1,
      local_metadata: { elastic: { agent: { version: '8.18.0' } } },
    } as unknown as Agent;

    const results = render(policy, agent);
    expect(results.container.textContent).toContain('2 warnings');
    expect(results.container.textContent).not.toContain('Outdated policy');
    expect(results.container.textContent).not.toContain('Incompatible integrations');
  });

  test('it should not render incompatible integrations warning when min_agent_version is not set', async () => {
    const policy = {
      name: 'test',
      revision: 2,
      package_agent_version_conditions: [
        { name: 'auth0', title: 'Auth0', version_condition: '^9.3.0' },
      ],
    } as AgentPolicy;
    const agent = {
      policy_revision: 2,
      local_metadata: { elastic: { agent: { version: '8.18.0' } } },
    } as unknown as Agent;

    const results = render(policy, agent);
    expect(results.container.textContent).not.toContain('Incompatible integrations');
    expect(results.container.textContent).not.toContain('warnings');
  });

  describe('showPolicyId', () => {
    const renderWithPolicyId = (showPolicyId: boolean) =>
      testRenderer.render(
        <AgentPolicySummaryLine
          policy={{ id: 'policy-id-123', name: 'My Policy', revision: 1 } as AgentPolicy}
          showPolicyId={showPolicyId}
        />
      );

    test('it should not show the policy ID inline by default', () => {
      const results = renderWithPolicyId(false);
      expect(results.container.textContent).not.toContain('policy-id-123');
      expect(results.container.textContent).toContain('My Policy');
    });

    test('it should show only the policy name inline when showPolicyId is true', () => {
      const results = renderWithPolicyId(true);
      expect(results.container.textContent).not.toContain('policy-id-123');
      expect(results.container.textContent).toContain('My Policy');
    });

    test('it should render a tooltip with the policy ID when showPolicyId is true', () => {
      const results = renderWithPolicyId(true);
      expect(results.getByTitle('My Policy').closest('[data-popover-open]')).toBeDefined();
      const tooltipAnchor = results.container.querySelector(
        '[data-test-subj="agentPolicyNameLink"]'
      );
      expect(tooltipAnchor).not.toBeNull();
      // The EuiToolTip wrapper is present (it wraps the link when showPolicyId && name)
      const tooltipWrapper = tooltipAnchor?.closest('.euiToolTipAnchor');
      expect(tooltipWrapper).not.toBeNull();
    });

    test('it should fall back to showing the ID inline when the policy has no name', () => {
      const results = testRenderer.render(
        <AgentPolicySummaryLine
          policy={{ id: 'policy-id-123', revision: 1 } as AgentPolicy}
          showPolicyId={true}
        />
      );
      expect(results.container.textContent).toContain('policy-id-123');
    });
  });
});
