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
import { SettingsSection } from './settings_section';
import type { SettingsSectionProps } from './settings_section';

jest.mock('../../../hooks/use_is_context_engine_enabled', () => ({
  useIsContextEngineEnabled: () => mockIsContextEngineEnabled,
}));
jest.mock('../../../hooks/ai_indices/use_inherited_ai_indices', () => ({
  useInheritedAiIndices: () => ({
    inheritedAiIndicesByAgentId: { [AGENT_ID]: mockInheritedIds },
    isLoading: mockInheritedIsLoading,
    error: undefined,
  }),
}));

const AGENT_ID = 'my-agent';

let mockIsContextEngineEnabled = true;
let mockInheritedIds: string[] = [];
let mockInheritedIsLoading = false;

const renderSection = (props: Partial<SettingsSectionProps> = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <SettingsSection
          enableElasticCapabilities
          currentInstructions=""
          showWorkflowSection
          workflowIds={[]}
          canEditAgent
          onOpenEditFlyout={jest.fn()}
          agentId={AGENT_ID}
          assignedAiIndices={[]}
          {...props}
        />
      </IntlProvider>
    </EuiProvider>
  );

describe('SettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsContextEngineEnabled = true;
    mockInheritedIds = [];
    mockInheritedIsLoading = false;
  });

  describe('AI indices row', () => {
    it('is hidden when the Context Engine is off', () => {
      mockIsContextEngineEnabled = false;

      renderSection({ assignedAiIndices: ['sales'] });

      expect(screen.queryByTestId('agentOverviewAiIndices')).not.toBeInTheDocument();
    });

    it('names the AI indices the agent type contributes as defaults', () => {
      mockInheritedIds = ['sig-events'];

      renderSection();

      expect(screen.getByTestId('agentOverviewAiIndices')).toHaveTextContent(
        'sig-events (default)'
      );
    });

    it('names the AI indices assigned to the agent', () => {
      renderSection({ assignedAiIndices: ['sales'] });

      expect(screen.getByTestId('agentOverviewAiIndices')).toHaveTextContent('sales');
    });

    it('lists both layers, defaults first', () => {
      mockInheritedIds = ['sig-events'];

      renderSection({ assignedAiIndices: ['sales'] });

      expect(screen.getByTestId('agentOverviewAiIndices')).toHaveTextContent(
        'sig-events (default), sales'
      );
    });

    // An id in both layers already applies as a default, so naming it twice would be misleading.
    it('names an id in both layers once', () => {
      mockInheritedIds = ['sig-events'];

      renderSection({ assignedAiIndices: ['sig-events'] });

      expect(screen.getByTestId('agentOverviewAiIndices')).toHaveTextContent(
        'sig-events (default)'
      );
    });

    it('reads "Not set" when neither layer contributes', () => {
      renderSection();

      expect(screen.getByTestId('agentOverviewAiIndices')).toHaveTextContent('Not set');
    });

    // A missing inherited entry means nothing while the query is in flight, so the row must not
    // claim "Not set" and then flip once the defaults arrive.
    it('shows a placeholder instead of "Not set" while the inherited ids load', () => {
      mockInheritedIsLoading = true;

      renderSection();

      expect(screen.getByTestId('agentOverviewAiIndicesLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('agentOverviewAiIndices')).not.toBeInTheDocument();
    });
  });
});
