/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { FormProvider, useForm } from 'react-hook-form';
import { AiIndicesSection } from './ai_indices_section';
import type { EditDetailsFormData } from './types';

jest.mock('../../../../hooks/use_is_context_engine_enabled', () => ({
  useIsContextEngineEnabled: () => mockIsContextEngineEnabled,
}));
jest.mock('../../../../hooks/ai_indices/use_list_ai_indices', () => ({
  useListAiIndices: () => ({
    aiIndices: mockAvailableAiIndices,
    isLoading: false,
    error: undefined,
  }),
}));
jest.mock('../../../../hooks/ai_indices/use_agent_ai_indices_by_id', () => ({
  useAgentAiIndicesById: () => ({
    aiIndices: mockAgentAiIndices,
    isLoading: false,
    error: undefined,
  }),
}));

const AGENT_ID = 'my-agent';

let mockIsContextEngineEnabled = true;
let mockAgentAiIndices: Array<{ id: string; is_default: boolean }> = [];
let mockAvailableAiIndices: Array<{ id: string; description?: string; managed: boolean }> = [];

const onSubmit = jest.fn();

const TestForm: React.FC<{ assignedIds?: string[] }> = ({ assignedIds = [] }) => {
  const form = useForm<EditDetailsFormData>({
    defaultValues: { configuration: { ai_indices: assignedIds } },
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AiIndicesSection agentId={AGENT_ID} />
        <button type="submit">submit</button>
      </form>
    </FormProvider>
  );
};

const renderSection = (props: Parameters<typeof TestForm>[0] = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <TestForm {...props} />
      </IntlProvider>
    </EuiProvider>
  );

const submittedAiIndices = () => onSubmit.mock.calls[0][0].configuration.ai_indices;

describe('AiIndicesSection (edit settings flyout)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsContextEngineEnabled = true;
    mockAgentAiIndices = [];
    mockAvailableAiIndices = [{ id: 'sales-outreach', managed: false }];
  });

  it('renders nothing when the Context Engine is off', () => {
    mockIsContextEngineEnabled = false;

    renderSection();

    expect(screen.queryByTestId('editDetailsAiIndicesSection')).not.toBeInTheDocument();
  });

  it('renders the panel when the Context Engine is on', () => {
    renderSection();

    expect(screen.getByTestId('editDetailsAiIndicesSection')).toBeInTheDocument();
  });

  it('lists the AI indices the agent type contributes', () => {
    mockAgentAiIndices = [{ id: 'sig-events', is_default: true }];

    renderSection();

    expect(screen.getByTestId('agentBuilderDefaultAiIndex-sig-events')).toBeInTheDocument();
  });

  it('submits the AI indices the user picks', async () => {
    renderSection();

    await userEvent.click(
      within(screen.getByTestId('agentBuilderAdditionalAiIndices')).getByTestId(
        'comboBoxToggleListButton'
      )
    );
    await userEvent.click(await screen.findByTestId('agentBuilderAiIndexOption-sales-outreach'));
    await userEvent.click(screen.getByText('submit'));

    expect(submittedAiIndices()).toEqual(['sales-outreach']);
  });

  it('keeps the assigned AI indices when nothing is changed', async () => {
    renderSection({ assignedIds: ['sales-outreach'] });

    await userEvent.click(screen.getByText('submit'));

    expect(submittedAiIndices()).toEqual(['sales-outreach']);
  });
});
