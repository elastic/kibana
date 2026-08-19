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
import { useForm } from 'react-hook-form';
import type { AgentFormData } from '../agent_form';
import { AiIndicesSection } from './ai_indices_section';

jest.mock('../../../../hooks/use_is_context_engine_enabled', () => ({
  useIsContextEngineEnabled: () => mockIsContextEngineEnabled,
}));
jest.mock('../../../../hooks/ai_indices/use_list_ai_indices', () => ({
  useListAiIndices: () => ({ aiIndices: mockAiIndices, isLoading: false, error: undefined }),
}));
jest.mock('../../../../hooks/ai_indices/use_inherited_ai_indices', () => ({
  useInheritedAiIndices: () => ({
    inheritedAiIndicesByAgentId: { [AGENT_ID]: mockInheritedIds },
    isLoading: false,
    error: undefined,
  }),
}));

const AGENT_ID = 'my-agent';

let mockIsContextEngineEnabled = true;
let mockInheritedIds: string[] = [];
let mockAiIndices: Array<{ id: string; description?: string; managed: boolean }> = [];

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
      <AiIndicesSection control={control} agentId={AGENT_ID} isFormDisabled={isFormDisabled} />
      <button type="submit">submit</button>
    </form>
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

const openList = async () => {
  await userEvent.click(screen.getByTestId('agentBuilderAdditionalAiIndicesButton'));
  return screen.findByTestId('agentBuilderAdditionalAiIndicesSelectable');
};
const optionFor = (id: string) => screen.getByTestId(`agentBuilderAiIndexOption-${id}`);
const submittedAiIndices = () => onSubmit.mock.calls[0][0].configuration.ai_indices;

describe('AiIndicesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsContextEngineEnabled = true;
    mockInheritedIds = [];
    mockAiIndices = [
      { id: 'elastic-ai-index', description: 'Ready', managed: false },
      { id: 'sales-outreach', description: 'Ready', managed: false },
      { id: 'nightshift', managed: true },
    ];
  });

  it('renders nothing when the Context Engine is off', () => {
    mockIsContextEngineEnabled = false;

    renderSection();

    expect(screen.queryByText('AI Indices')).not.toBeInTheDocument();
  });

  it('renders the section when the Context Engine is on', () => {
    renderSection();

    expect(screen.getByText('AI Indices')).toBeInTheDocument();
  });

  describe('default indices', () => {
    it('are listed as badges', () => {
      mockInheritedIds = ['sig-events'];

      renderSection();

      expect(screen.getByTestId('agentBuilderDefaultAiIndex-sig-events')).toHaveTextContent(
        'sig-events (default)'
      );
    });

    it('are hidden when the agent type contributes none', () => {
      renderSection();

      expect(screen.queryByTestId('agentBuilderDefaultAiIndices')).not.toBeInTheDocument();
    });

    // They already apply, so offering them again would let the user store a redundant id whose
    // removal changes nothing on screen.
    it('are not offered as additional indices', async () => {
      mockInheritedIds = ['sig-events'];
      mockAiIndices = [...mockAiIndices, { id: 'sig-events', managed: true }];

      renderSection();
      await openList();

      expect(screen.queryByTestId('agentBuilderAiIndexOption-sig-events')).not.toBeInTheDocument();
    });

    it('are never written back onto the agent', async () => {
      mockInheritedIds = ['sig-events'];

      renderSection({ assignedIds: ['sales-outreach'] });

      await userEvent.click(screen.getByText('submit'));

      expect(submittedAiIndices()).toEqual(['sales-outreach']);
    });
  });

  describe('additional indices', () => {
    it('submits the id list when one is checked', async () => {
      renderSection();
      await openList();

      await userEvent.click(optionFor('sales-outreach'));
      await userEvent.click(screen.getByText('submit'));

      expect(submittedAiIndices()).toEqual(['sales-outreach']);
    });

    // The whole point of the checkbox list: unlike a combo box, selected options stay listed and
    // show their state, so unchecking is how you remove one.
    it('keeps the assigned ones listed, and checked', async () => {
      renderSection({ assignedIds: ['sales-outreach'] });
      await openList();

      expect(optionFor('sales-outreach')).toHaveAttribute('aria-checked', 'true');
      expect(optionFor('elastic-ai-index')).toHaveAttribute('aria-checked', 'false');
    });

    it('submits without the id when one is unchecked', async () => {
      renderSection({ assignedIds: ['sales-outreach', 'elastic-ai-index'] });
      await openList();

      await userEvent.click(optionFor('sales-outreach'));
      await userEvent.click(screen.getByText('submit'));

      expect(submittedAiIndices()).toEqual(['elastic-ai-index']);
    });

    it('shows the assigned ones as removable pills', async () => {
      renderSection({ assignedIds: ['sales-outreach'] });

      await userEvent.click(
        within(screen.getByTestId('agentBuilderSelectedAiIndex-sales-outreach')).getByRole('button')
      );
      await userEvent.click(screen.getByText('submit'));

      expect(submittedAiIndices()).toEqual([]);
    });

    it('describes each option in the list', async () => {
      renderSection();
      await openList();

      expect(screen.getAllByText('Ready').length).toBe(2);
    });

    it('is disabled when the user cannot edit the agent', () => {
      renderSection({ isFormDisabled: true });

      expect(screen.getByTestId('agentBuilderAdditionalAiIndicesButton')).toBeDisabled();
    });

    // The API does not validate stored ids, so an agent can reference an index that was deleted or
    // that falls outside the list endpoint's cap. Dropping those on save would lose configuration.
    it('keeps assigned ids the Context Engine does not know about', async () => {
      renderSection({ assignedIds: ['deleted-index'] });

      expect(screen.getByTestId('agentBuilderSelectedAiIndex-deleted-index')).toBeInTheDocument();

      await userEvent.click(screen.getByText('submit'));

      expect(submittedAiIndices()).toEqual(['deleted-index']);
    });
  });
});
