/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AgentAiIndices } from './agent_ai_indices';

const renderCell = (aiIndices: string[]) =>
  render(
    <IntlProvider locale="en">
      <AgentAiIndices aiIndices={aiIndices} />
    </IntlProvider>
  );

describe('AgentAiIndices', () => {
  it('renders one badge per AI index', () => {
    renderCell(['elastic', 'sales']);

    expect(screen.getByTestId('agentBuilderAgentAiIndex-elastic')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAgentAiIndex-sales')).toBeInTheDocument();
  });

  it('renders nothing when the agent retrieves from none', () => {
    renderCell([]);

    expect(screen.queryByTestId('agentBuilderAgentAiIndices')).not.toBeInTheDocument();
  });

  it('collapses the overflow into a count badge', () => {
    renderCell(['elastic', 'sales', 'support', 'docs']);

    expect(screen.getByTestId('agentBuilderAgentAiIndexHiddenCount')).toHaveTextContent('+2');
    expect(screen.queryByTestId('agentBuilderAgentAiIndex-support')).not.toBeInTheDocument();
  });

  it('is read only, so it renders no controls', () => {
    renderCell(['elastic', 'sales']);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});
