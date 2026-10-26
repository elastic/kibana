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
import { EuiProvider } from '@elastic/eui';
import { FormProvider, useForm } from 'react-hook-form';
import type { AgentFormData } from '../agent_form';
import { SubagentsSection } from './subagents_section';

jest.mock('../../../../hooks/agents/use_agents', () => ({
  useAgentBuilderAgents: () => ({ agents: [] }),
}));

const TestForm: React.FC = () => {
  const form = useForm<AgentFormData>({
    defaultValues: { configuration: { subagent_ids: [] } } as unknown as AgentFormData,
  });
  return (
    <FormProvider {...form}>
      <SubagentsSection agentId="my-agent" />
    </FormProvider>
  );
};

describe('SubagentsSection (agent edit form)', () => {
  it('renders without the experimental features setting', () => {
    render(
      <EuiProvider>
        <IntlProvider locale="en">
          <TestForm />
        </IntlProvider>
      </EuiProvider>
    );

    expect(screen.getByTestId('subagentsEnableCheckbox')).toBeInTheDocument();
  });
});
