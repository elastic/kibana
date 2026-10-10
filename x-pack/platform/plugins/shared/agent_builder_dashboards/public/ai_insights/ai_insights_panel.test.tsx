/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  AI_INSIGHTS_GENERATION_MODE,
  AI_INSIGHTS_STATUS,
} from '../../common/ai_insights/constants';
import { AiInsightsPanel } from './ai_insights_panel';

const noop = () => undefined;

describe('AiInsightsPanel', () => {
  it('shows empty card when there are no connectors', () => {
    const onSetupConnector = jest.fn();
    render(
      <AiInsightsPanel
        insight={undefined}
        isLoading={false}
        hasConnectors={false}
        hasSelectedConnector={false}
        isConnectorsLoading={false}
        generationMode={AI_INSIGHTS_GENERATION_MODE.automatic}
        isStale={false}
        onSetupConnector={onSetupConnector}
        onOpenSettings={noop}
        onGenerate={noop}
        onUpdate={noop}
      />
    );

    expect(screen.getByText(/No model selected/i)).toBeInTheDocument();
    screen.getByRole('button', { name: /Pick model/i }).click();
    expect(onSetupConnector).toHaveBeenCalled();
  });

  it('shows on-demand generate card instead of auto-loading', () => {
    const onGenerate = jest.fn();
    render(
      <AiInsightsPanel
        insight={undefined}
        isLoading={false}
        hasConnectors={true}
        hasSelectedConnector={true}
        isConnectorsLoading={false}
        generationMode={AI_INSIGHTS_GENERATION_MODE.on_demand}
        isStale={false}
        onSetupConnector={noop}
        onOpenSettings={noop}
        onGenerate={onGenerate}
        onUpdate={noop}
      />
    );

    expect(screen.getByText(/Generate AI Insights for this dashboard/i)).toBeInTheDocument();
    screen.getByTestId('aiInsightsGenerateButton').click();
    expect(onGenerate).toHaveBeenCalled();
  });

  it('shows stale inline notice with update action', () => {
    const onUpdate = jest.fn();
    render(
      <AiInsightsPanel
        insight={{
          status: AI_INSIGHTS_STATUS.green,
          summary: 'Fleet looks healthy overall.',
          attention_points: [],
          suggested_actions: [],
        }}
        isLoading={false}
        hasConnectors={true}
        hasSelectedConnector={true}
        isConnectorsLoading={false}
        generationMode={AI_INSIGHTS_GENERATION_MODE.automatic}
        isStale={true}
        onSetupConnector={noop}
        onOpenSettings={noop}
        onGenerate={noop}
        onUpdate={onUpdate}
      />
    );

    expect(screen.getByTestId('aiInsightsStaleCallout')).toBeInTheDocument();
    screen.getByRole('button', { name: /Update panel/i }).click();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('shows skeleton loading without collapse controls', () => {
    render(
      <AiInsightsPanel
        insight={{
          status: AI_INSIGHTS_STATUS.green,
          summary: 'Fleet looks healthy overall.',
          attention_points: [],
          suggested_actions: [],
        }}
        isLoading={true}
        hasConnectors={true}
        hasSelectedConnector={true}
        isConnectorsLoading={false}
        generationMode={AI_INSIGHTS_GENERATION_MODE.automatic}
        isStale={false}
        isExpanded={false}
        onToggleExpanded={noop}
        onSetupConnector={noop}
        onOpenSettings={noop}
        onGenerate={noop}
        onUpdate={noop}
      />
    );

    expect(screen.getByTestId('aiInsightsGeneratingBadge')).toHaveTextContent(
      /Generating AI insights/i
    );
    expect(screen.getByTestId('aiInsightsLoadingSkeleton')).toBeInTheDocument();
    expect(screen.queryByText('Fleet looks healthy overall.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('aiInsightsCollapseButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('aiInsightsTitleToggle')).not.toBeInTheDocument();
  });

  it('shows summary then recommended actions in the content card', () => {
    const generatedAt = new Date(2026, 9, 8, 9, 43).toISOString();
    render(
      <AiInsightsPanel
        insight={{
          status: AI_INSIGHTS_STATUS.yellow,
          summary: 'Memory pressure is elevated on a few hosts.',
          attention_points: ['Memory nearing threshold'],
          suggested_actions: ['Review memory trends'],
          generated_by: 'nicolas.prouvost@elastic.co',
          generated_at: generatedAt,
        }}
        isLoading={false}
        hasConnectors={true}
        hasSelectedConnector={true}
        isConnectorsLoading={false}
        generationMode={AI_INSIGHTS_GENERATION_MODE.automatic}
        isStale={false}
        isExpanded={true}
        onToggleExpanded={noop}
        onSetupConnector={noop}
        onOpenSettings={noop}
        onGenerate={noop}
        onUpdate={noop}
      />
    );

    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('aiInsightsCollapsedStatus')).toHaveTextContent(
      'A few things to watch'
    );
    expect(screen.getByText('Memory pressure is elevated on a few hosts.')).toBeInTheDocument();
    expect(screen.getByText('Memory nearing threshold')).toBeInTheDocument();
    expect(screen.getByText('Recommended actions')).toBeInTheDocument();
    expect(screen.getByText('Review memory trends')).toBeInTheDocument();
    expect(screen.getByTestId('aiInsightsGeneratedBy')).toHaveTextContent(
      'Generated by nicolas.prouvost@elastic.co on Oct 08, 2026 at 09:43'
    );
    expect(screen.queryByTestId('aiInsightsAddToChat')).not.toBeInTheDocument();
  });

  it('collapses the panel to a compact status pill', () => {
    const onToggleExpanded = jest.fn();
    const { rerender } = render(
      <AiInsightsPanel
        insight={{
          status: AI_INSIGHTS_STATUS.green,
          summary: 'Fleet looks healthy overall.',
          attention_points: [],
          suggested_actions: [],
        }}
        isLoading={false}
        hasConnectors={true}
        hasSelectedConnector={true}
        isConnectorsLoading={false}
        generationMode={AI_INSIGHTS_GENERATION_MODE.automatic}
        isStale={false}
        isExpanded={true}
        onToggleExpanded={onToggleExpanded}
        onSetupConnector={noop}
        onOpenSettings={noop}
        onGenerate={noop}
        onUpdate={noop}
      />
    );

    fireEvent.click(screen.getByTestId('aiInsightsCollapseButton'));
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('aiInsightsTitleToggle'));
    expect(onToggleExpanded).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId('aiInsightsCollapsedStatus'));
    expect(onToggleExpanded).toHaveBeenCalledTimes(3);

    rerender(
      <AiInsightsPanel
        insight={{
          status: AI_INSIGHTS_STATUS.green,
          summary: 'Fleet looks healthy overall.',
          attention_points: [],
          suggested_actions: [],
        }}
        isLoading={false}
        hasConnectors={true}
        hasSelectedConnector={true}
        isConnectorsLoading={false}
        generationMode={AI_INSIGHTS_GENERATION_MODE.automatic}
        isStale={false}
        isExpanded={false}
        onToggleExpanded={onToggleExpanded}
        onSetupConnector={noop}
        onOpenSettings={noop}
        onGenerate={noop}
        onUpdate={noop}
      />
    );

    expect(screen.getByTestId('aiInsightsCollapsedStatus')).toHaveTextContent(
      'Everything looks OK'
    );
    expect(screen.queryByTestId('aiInsightsStatus')).not.toBeInTheDocument();
  });
});
