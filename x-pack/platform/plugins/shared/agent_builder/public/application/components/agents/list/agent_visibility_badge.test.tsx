/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AgentType, AgentVisibility } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { AgentVisibilityBadge } from './agent_visibility_badge';

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

describe('AgentVisibilityBadge', () => {
  it('shows Read-only badge when agent is readonly', () => {
    renderWithIntl(<AgentVisibilityBadge agent={{ ...baseAgent, readonly: true }} />);

    expect(screen.getByTestId('agentBuilderAgentsListVisibilityBuiltInBadge')).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
  });

  it('shows Private visibility badge when visibility is private', () => {
    renderWithIntl(
      <AgentVisibilityBadge agent={{ ...baseAgent, visibility: AgentVisibility.Private }} />
    );

    expect(screen.getByTestId('agentBuilderAgentsListVisibility-private')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('shows Shared visibility badge when visibility is shared', () => {
    renderWithIntl(
      <AgentVisibilityBadge agent={{ ...baseAgent, visibility: AgentVisibility.Shared }} />
    );

    expect(screen.getByTestId('agentBuilderAgentsListVisibility-shared')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('shows Public visibility badge when visibility is public', () => {
    renderWithIntl(
      <AgentVisibilityBadge agent={{ ...baseAgent, visibility: AgentVisibility.Public }} />
    );

    expect(screen.getByTestId('agentBuilderAgentsListVisibility-public')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('defaults to Public when visibility is undefined', () => {
    renderWithIntl(<AgentVisibilityBadge agent={baseAgent} />);

    expect(screen.getByTestId('agentBuilderAgentsListVisibility-public')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });
});
