/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { useForm } from 'react-hook-form';
import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
import type { AgentFormData } from '../agent_form';
import { AiIndicesTab } from './ai_indices_tab';

const mockNavigateToContextEngine = jest.fn();

jest.mock('../../../../hooks/ai_indices/use_list_ai_indices');
jest.mock('../../../../hooks/ai_indices/use_inherited_ai_indices');
jest.mock('../../../../hooks/use_navigation', () => ({
  useNavigation: () => ({ navigateToContextEngine: mockNavigateToContextEngine }),
}));

const { useListAiIndices } = jest.requireMock('../../../../hooks/ai_indices/use_list_ai_indices');
const { useInheritedAiIndices } = jest.requireMock(
  '../../../../hooks/ai_indices/use_inherited_ai_indices'
);

const AGENT_ID = 'my-agent';

const onSubmit = jest.fn();

const TestForm: React.FC<{ assignedIds?: string[]; isFormDisabled?: boolean }> = ({
  assignedIds = [],
  isFormDisabled = false,
}) => {
  const { control, handleSubmit } = useForm<AgentFormData>({
    defaultValues: { configuration: { tools: [], ai_indices: assignedIds } },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <AiIndicesTab control={control} agentId={AGENT_ID} isFormDisabled={isFormDisabled} />
      <button type="submit">submit</button>
    </form>
  );
};

const show = ({
  registeredIds = [agentBuilderDefaultAiIndexId, 'sales', 'support'],
  inheritedIds = [] as string[],
}: { registeredIds?: string[]; inheritedIds?: string[] } = {}) => {
  useListAiIndices.mockReturnValue({
    aiIndices: registeredIds.map((id) => ({ id })),
    isLoading: false,
    error: undefined,
  });
  useInheritedAiIndices.mockReturnValue({
    inheritedAiIndicesByAgentId: { [AGENT_ID]: inheritedIds },
    isLoading: false,
    error: undefined,
  });
};

const renderTab = (props: Parameters<typeof TestForm>[0] = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <TestForm {...props} />
      </IntlProvider>
    </EuiProvider>
  );

const checkboxFor = (id: string) => screen.getByTestId(`agentBuilderAiIndexCheckbox-${id}`);

const submittedAiIndices = () => onSubmit.mock.calls[0][0].configuration.ai_indices;

describe('AiIndicesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    show();
  });

  it('lists every AI index the Context Engine knows about', () => {
    renderTab();

    expect(screen.getByText('sales')).toBeInTheDocument();
    expect(screen.getByText('support')).toBeInTheDocument();
  });

  it('ticks the AI indices assigned to the agent', () => {
    renderTab({ assignedIds: ['sales'] });

    expect(checkboxFor('sales')).toBeChecked();
    expect(checkboxFor('support')).not.toBeChecked();
  });

  it('submits the id list when an AI index is checked', async () => {
    renderTab({ assignedIds: ['sales'] });

    await userEvent.click(checkboxFor('support'));
    await userEvent.click(screen.getByText('submit'));

    expect(submittedAiIndices()).toEqual(['sales', 'support']);
  });

  it('submits without the id when one is unchecked', async () => {
    renderTab({ assignedIds: ['sales', 'support'] });

    await userEvent.click(checkboxFor('sales'));
    await userEvent.click(screen.getByText('submit'));

    expect(submittedAiIndices()).toEqual(['support']);
  });

  it('disables every checkbox when the user cannot edit the agent', () => {
    renderTab({ isFormDisabled: true });

    expect(checkboxFor('sales')).toBeDisabled();
  });

  describe('AI indices contributed by the agent type', () => {
    it('are ticked and cannot be unticked', () => {
      show({ inheritedIds: [agentBuilderDefaultAiIndexId] });

      renderTab();

      expect(checkboxFor(agentBuilderDefaultAiIndexId)).toBeChecked();
      expect(checkboxFor(agentBuilderDefaultAiIndexId)).toBeDisabled();
    });

    it('are listed even when the Context Engine does not know them', () => {
      show({ inheritedIds: ['another-one'] });

      renderTab();

      expect(checkboxFor('another-one')).toBeChecked();
      expect(checkboxFor('another-one')).toBeDisabled();
    });

    // An id in both layers is still inherited, so it must stay disabled rather than become
    // editable: unticking it would drop the assignment while the type keeps contributing it.
    it('stay disabled when the agent also stores the same id', () => {
      show({ inheritedIds: [agentBuilderDefaultAiIndexId] });

      renderTab({ assignedIds: [agentBuilderDefaultAiIndexId] });

      expect(checkboxFor(agentBuilderDefaultAiIndexId)).toBeDisabled();
    });

    it('are never written back onto the agent', async () => {
      show({ inheritedIds: [agentBuilderDefaultAiIndexId] });

      renderTab();

      await userEvent.click(checkboxFor('sales'));
      await userEvent.click(screen.getByText('submit'));

      expect(submittedAiIndices()).toEqual(['sales']);
    });
  });

  // The API does not validate stored ids, so an agent can reference an index that was deleted or
  // that falls outside the list endpoint's cap. Dropping those on an unrelated edit would destroy
  // configuration with no warning.
  describe('stored AI indices the Context Engine does not know about', () => {
    it('are listed as checked', () => {
      renderTab({ assignedIds: ['deleted-index'] });

      expect(checkboxFor('deleted-index')).toBeChecked();
    });

    it('survive an unrelated edit', async () => {
      renderTab({ assignedIds: ['deleted-index'] });

      await userEvent.click(checkboxFor('sales'));
      await userEvent.click(screen.getByText('submit'));

      expect(submittedAiIndices().sort()).toEqual(['deleted-index', 'sales']);
    });
  });

  it('surfaces an error when the AI index list cannot be loaded', () => {
    useListAiIndices.mockReturnValue({ aiIndices: [], isLoading: false, error: new Error('boom') });

    renderTab();

    expect(screen.getByTestId('agentBuilderAiIndicesError')).toBeInTheDocument();
  });

  it('links to AI index creation in the Context Engine', async () => {
    renderTab();

    await userEvent.click(screen.getByTestId('agentBuilderCreateAiIndexLink'));

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith('/ai_index/create');
  });
});
