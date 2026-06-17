/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AgentType, AgentAccessControlScope } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { AgentAccessControlScopeBadge } from './agent_access_control_scope_badge';

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

const baseAgent: AgentDefinition = {
  id: 'agent-1',
  type: AgentType.chat,
  name: 'Test Agent',
  description: 'Description',
  readonly: false,
  configuration: { tools: [] },
};

describe('AgentAccessControlScopeBadge', () => {
  it('shows Read-only badge when agent is readonly', () => {
    renderWithIntl(<AgentAccessControlScopeBadge agent={{ ...baseAgent, readonly: true }} />);

    expect(
      screen.getByTestId('agentBuilderAgentsListAccessControlScopeBuiltInBadge')
    ).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
  });

  it('shows Private access-control scope badge when scope is private', () => {
    renderWithIntl(
      <AgentAccessControlScopeBadge
        agent={{
          ...baseAgent,
          access_control: { scope: AgentAccessControlScope.Private, entries: [] },
        }}
      />
    );

    expect(
      screen.getByTestId('agentBuilderAgentsListAccessControlScope-private')
    ).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('shows Shared access-control scope badge when scope is shared', () => {
    renderWithIntl(
      <AgentAccessControlScopeBadge
        agent={{
          ...baseAgent,
          access_control: { scope: AgentAccessControlScope.Shared, entries: [] },
        }}
      />
    );

    expect(
      screen.getByTestId('agentBuilderAgentsListAccessControlScope-shared')
    ).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('shows Public access-control scope badge when scope is public', () => {
    renderWithIntl(
      <AgentAccessControlScopeBadge
        agent={{
          ...baseAgent,
          access_control: { scope: AgentAccessControlScope.Public, entries: [] },
        }}
      />
    );

    expect(
      screen.getByTestId('agentBuilderAgentsListAccessControlScope-public')
    ).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('defaults to Public when access-control scope is undefined', () => {
    renderWithIntl(<AgentAccessControlScopeBadge agent={baseAgent} />);

    expect(
      screen.getByTestId('agentBuilderAgentsListAccessControlScope-public')
    ).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });
});
