/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationState } from '@kbn/significant-events-schema';
import { InvestigationOutput } from './investigation_output';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const liveState: InvestigationState = {
  summary: 'Latency spike correlates with a deploy at 14:02.',
  hypotheses: [
    {
      candidate: 'Network partition',
      confidence: 0.1,
      status: 'dismissed',
      reason: 'No packet loss observed.',
    },
    {
      candidate: 'Connection pool exhaustion after the 14:02 deploy',
      confidence: 0.6,
      status: 'investigating',
    },
  ],
};

const finalState: InvestigationState = {
  summary: 'The investigation is complete.',
  hypotheses: [
    {
      candidate: 'Disk saturation',
      confidence: 0.05,
      status: 'dismissed',
      reason: 'IOPS stayed flat.',
    },
    {
      candidate: 'Connection pool exhaustion after the 14:02 deploy',
      confidence: 0.9,
      status: 'confirmed',
      reason: 'Pool metrics spiked exactly at deploy time.',
    },
  ],
  conclusion: 'A deploy at 14:02 introduced a connection leak in the checkout service.',
  gaps_found: ['No profiling data available'],
};

describe('InvestigationOutput', () => {
  it('renders a generic gathering-evidence message and an empty hypotheses placeholder when running with no state yet', () => {
    renderWithI18n(<InvestigationOutput isRunning />);

    expect(screen.getByText('Gathering evidence')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputNoHypotheses')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputOpenDetailsButton')).not.toBeInTheDocument();
  });

  it('renders live state while running, including the hypotheses list and their statuses', () => {
    renderWithI18n(<InvestigationOutput isRunning state={liveState} />);

    expect(screen.getByText('Evaluating 2 hypotheses')).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
    expect(screen.getByText('Network partition')).toBeInTheDocument();
    expect(screen.getByText('No packet loss observed.')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputHypothesisStatus-dismissed')).toBeInTheDocument();
    expect(screen.getAllByTestId('investigationOutputConfidenceBadge')[0]).toHaveTextContent('10%');
  });

  it('renders the final state once settled, with the confirmed hypothesis and expandable conclusion/gaps', () => {
    renderWithI18n(<InvestigationOutput isRunning={false} state={finalState} />);

    expect(screen.getByText('Investigation complete')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputHypothesisStatus-confirmed')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('investigationOutputOpenDetailsButton'));

    expect(screen.getByText(finalState.conclusion!)).toBeInTheDocument();
    expect(screen.getByText('No profiling data available')).toBeInTheDocument();
  });

  it('renders a loading state when settled but no state or error has arrived yet', () => {
    renderWithI18n(<InvestigationOutput isRunning={false} />);

    expect(screen.getByText('Loading investigation result…')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputLoadingSpinner')).toBeInTheDocument();
  });

  it('renders the error and does not offer to open details when there is no state to show', () => {
    renderWithI18n(<InvestigationOutput isRunning={false} error="No connector configured" />);

    expect(screen.getByText('Investigation failed')).toBeInTheDocument();
    expect(screen.getByText('No connector configured')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputOpenDetailsButton')).not.toBeInTheDocument();
  });

  it('keeps showing a stale live state alongside an error when the final fetch fails', () => {
    renderWithI18n(
      <InvestigationOutput
        isRunning={false}
        state={liveState}
        error="Couldn't load the investigation result."
      />
    );

    expect(screen.getByText("Couldn't load the investigation result.")).toBeInTheDocument();
    // Still settled with known state -> treated as complete, not failed, since state is present.
    expect(screen.getByText('Investigation complete')).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
  });

  it('delegates to onOpenDetails instead of expanding inline when provided', () => {
    const onOpenDetails = jest.fn();
    renderWithI18n(
      <InvestigationOutput isRunning={false} state={finalState} onOpenDetails={onOpenDetails} />
    );

    fireEvent.click(screen.getByTestId('investigationOutputOpenDetailsButton'));

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('investigationOutputDetails')).not.toBeInTheDocument();
  });
});
