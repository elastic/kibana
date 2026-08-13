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
  conclusion:
    '## Conclusion\n\nA deploy at 14:02 introduced a connection leak in the checkout service.',
  gaps_found: ['No profiling data available'],
};

const finalStateWithUpdates: InvestigationState = {
  ...finalState,
  significant_event_updates: [
    {
      field: 'severity',
      from: '40-medium',
      to: '80-critical',
      reason: 'Checkout is fully blocked for every user, not intermittently degraded as triaged.',
      evidence: [
        {
          description: 'Zero successful checkout completions during the incident window.',
          esql_query:
            'FROM traces | WHERE service.name == "checkout" | STATS failures = COUNT(*) WHERE event.outcome == "failure"',
        },
        { description: 'All checkout pods in CrashLoopBackOff for the full window.' },
      ],
    },
    {
      field: 'status',
      from: 'open',
      to: 'dismissed',
      reason: 'No actual failure was found — this is a false alarm from the triage model.',
      evidence: [{ description: 'All metrics stayed within normal bounds.' }],
    },
    {
      field: 'summary',
      from: 'Checkout latency is elevated.',
      to: 'Checkout is fully unavailable: no orders completed during the incident window.',
      reason: 'The triaged summary understated the impact.',
      evidence: [{ description: 'Order-completion rate dropped to zero.' }],
    },
  ],
};

describe('InvestigationOutput', () => {
  it('renders a generic gathering-evidence message and an empty hypotheses placeholder when running with no state yet', () => {
    renderWithI18n(<InvestigationOutput status="running" />);

    expect(screen.getByText('Gathering evidence')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputNoHypotheses')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders live state while running, including collapsed hypothesis accordions', () => {
    renderWithI18n(<InvestigationOutput status="running" state={liveState} />);

    expect(screen.getByText('Evaluating 2 hypotheses')).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
    expect(screen.getByText('Network partition')).toBeInTheDocument();
    // Collapsed by default.
    expect(screen.getByText('Network partition').closest('button')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByTestId('investigationOutputHypothesisStatus-dismissed')).toBeInTheDocument();
    expect(screen.getAllByTestId('investigationOutputConfidenceBadge')[0]).toHaveTextContent('10%');
  });

  it('reveals a hypothesis reason when its accordion is expanded', () => {
    renderWithI18n(<InvestigationOutput status="running" state={liveState} />);

    fireEvent.click(screen.getByText('Network partition'));

    expect(screen.getByText('No packet loss observed.')).toBeInTheDocument();
  });

  it('shows a placeholder when a hypothesis has no reason yet', () => {
    renderWithI18n(<InvestigationOutput status="running" state={liveState} />);

    fireEvent.click(screen.getByText('Connection pool exhaustion after the 14:02 deploy'));

    expect(screen.getByText('No reasoning recorded yet.')).toBeInTheDocument();
  });

  it('does not render final results for a mid-run conclusion (still a draft, possibly mangled markdown)', () => {
    renderWithI18n(<InvestigationOutput status="running" state={finalState} />);

    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders the final state with the confirmed hypothesis and the final results appended, always visible', () => {
    renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

    expect(screen.getByText('Investigation complete')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputHypothesisStatus-confirmed')).toBeInTheDocument();

    const finalResults = screen.getByTestId('investigationOutputFinalResults');
    expect(finalResults).toBeInTheDocument();
    expect(finalResults).toHaveTextContent(
      'A deploy at 14:02 introduced a connection leak in the checkout service.'
    );
    expect(finalResults).toHaveTextContent('Gaps found');
    expect(finalResults).toHaveTextContent('No profiling data available');
  });

  it('renders a loading state while the persisted result is being fetched', () => {
    renderWithI18n(<InvestigationOutput status="loading" />);

    expect(screen.getByText('Loading investigation result…')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputLoadingSpinner')).toBeInTheDocument();
  });

  it('renders a failed header with the error detail when the investigation failed', () => {
    renderWithI18n(<InvestigationOutput status="failed" error="No connector configured" />);

    expect(screen.getByText('Investigation failed')).toBeInTheDocument();
    expect(screen.getByText('No connector configured')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
  });

  it('renders a failed header even when stale live state is still shown', () => {
    renderWithI18n(
      <InvestigationOutput status="failed" state={liveState} error="The agent timed out." />
    );

    expect(screen.getByText('Investigation failed')).toBeInTheDocument();
    expect(screen.getByText('The agent timed out.')).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
  });

  it('renders an unavailable header alongside stale live state when the result could not be loaded', () => {
    renderWithI18n(
      <InvestigationOutput
        status="unavailable"
        state={liveState}
        error="Couldn't load the investigation result."
      />
    );

    expect(screen.getByText('Investigation result unavailable')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load the investigation result.")).toBeInTheDocument();
    expect(screen.getByText(liveState.summary)).toBeInTheDocument();
  });

  describe('significant_event_updates', () => {
    it('renders the proposed updates block with a severity and a status row when complete', () => {
      renderWithI18n(<InvestigationOutput status="complete" state={finalStateWithUpdates} />);

      expect(screen.getByTestId('investigationSignificantEventUpdates')).toBeInTheDocument();

      const severityRow = screen.getByTestId('investigationSignificantEventUpdate-severity');
      expect(severityRow).toHaveTextContent('Medium');
      expect(severityRow).toHaveTextContent('Critical');
      expect(severityRow).toHaveTextContent('Checkout is fully blocked for every user');
      expect(severityRow).toHaveTextContent('Zero successful checkout completions');
      expect(severityRow).toHaveTextContent('FROM traces | WHERE service.name == "checkout"');
      expect(severityRow).toHaveTextContent('All checkout pods in CrashLoopBackOff');

      const statusRow = screen.getByTestId('investigationSignificantEventUpdate-status');
      expect(statusRow).toHaveTextContent('Open');
      expect(statusRow).toHaveTextContent('Dismissed');
      expect(statusRow).toHaveTextContent('No actual failure was found');
    });

    it('renders a summary update as From/To free text (non-badge field)', () => {
      renderWithI18n(<InvestigationOutput status="complete" state={finalStateWithUpdates} />);

      const summaryRow = screen.getByTestId('investigationSignificantEventUpdate-summary');
      expect(summaryRow).toHaveTextContent('From: Checkout latency is elevated.');
      expect(summaryRow).toHaveTextContent('To: Checkout is fully unavailable');
      expect(summaryRow).toHaveTextContent('The triaged summary understated the impact.');
    });

    it('does not render the updates block when there are no updates', () => {
      renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

      expect(screen.queryByTestId('investigationSignificantEventUpdates')).not.toBeInTheDocument();
    });

    it('does not render the updates block while the investigation is still running', () => {
      renderWithI18n(<InvestigationOutput status="running" state={finalStateWithUpdates} />);

      expect(screen.queryByTestId('investigationSignificantEventUpdates')).not.toBeInTheDocument();
    });
  });
});
