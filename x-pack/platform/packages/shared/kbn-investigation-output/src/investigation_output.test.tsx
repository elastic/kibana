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

const treeState: InvestigationState = {
  ...liveState,
  tree: [
    {
      id: 'n1',
      kind: 'observation',
      title: 'Latency spiked at 14:02',
      detail: 'p99 jumped from 120ms to 4s.',
      status: 'done',
      references: [
        {
          type: 'query',
          label: 'p99 latency by service',
          esql: 'FROM traces-* | STATS p99 = PERCENTILE(duration, 99)',
          time_range: { from: '2026-07-09T13:00:00Z', to: '2026-07-09T15:00:00Z' },
        },
      ],
    },
    {
      id: 'n2',
      parent_id: 'n1',
      kind: 'hypothesis',
      title: 'Connection pool exhaustion after the 14:02 deploy',
      status: 'active',
    },
    {
      id: 'n3',
      parent_id: 'n1',
      kind: 'dead_end',
      title: 'Checked disk saturation — flat, abandoning',
      status: 'abandoned',
      references: [{ type: 'ki', ki_name: 'Host disk metrics', stream_name: 'metrics-system' }],
    },
    {
      id: 'n4',
      parent_id: 'n3',
      kind: 'action',
      title: 'Ran disk IOPS query',
      status: 'done',
    },
  ],
};

describe('InvestigationOutput', () => {
  describe('investigation trail', () => {
    it('renders the tree instead of the flat hypothesis list when the state carries one', () => {
      renderWithI18n(<InvestigationOutput status="running" state={treeState} />);

      expect(screen.getByTestId('investigationOutputTree')).toBeInTheDocument();
      expect(screen.getAllByTestId('investigationTreeNode')).toHaveLength(3);
      expect(screen.queryByTestId('investigationOutputHypotheses')).not.toBeInTheDocument();
      // Hypothesis node picks up the confidence of the matching hypotheses entry.
      expect(screen.getByTestId('investigationTreeNodeConfidence')).toHaveTextContent('60%');
      // Dead-end branch stays visible.
      expect(screen.getByText('Checked disk saturation — flat, abandoning')).toBeInTheDocument();
      // Every hypothesis gets an at-a-glance scoreboard chip.
      expect(screen.getByTestId('investigationHypothesesSummary')).toBeInTheDocument();
      expect(screen.getByTestId('investigationHypothesisChip-dismissed')).toBeInTheDocument();
    });

    it('hides node detail behind a per-node toggle', () => {
      renderWithI18n(<InvestigationOutput status="running" state={treeState} />);

      // n1 is `done`, so its long-form detail starts collapsed…
      expect(screen.queryByText('p99 jumped from 120ms to 4s.')).not.toBeInTheDocument();
      // …until the node header is clicked.
      fireEvent.click(screen.getByText('Latency spiked at 14:02'));
      expect(screen.getByText('p99 jumped from 120ms to 4s.')).toBeInTheDocument();
    });

    it('collapses the sub-steps of settled branches behind a count', () => {
      renderWithI18n(<InvestigationOutput status="running" state={treeState} />);

      // n4 sits under the abandoned dead-end n3 — hidden until the branch is expanded.
      expect(screen.queryByText('Ran disk IOPS query')).not.toBeInTheDocument();
      const showBranch = screen.getByTestId('investigationTreeNodeShowBranch');
      expect(showBranch).toHaveTextContent('Show 1 step');
      fireEvent.click(showBranch);
      expect(screen.getByText('Ran disk IOPS query')).toBeInTheDocument();
    });

    it('starts with the trail collapsed once the investigation is complete', () => {
      renderWithI18n(
        <InvestigationOutput status="complete" state={{ ...finalState, tree: treeState.tree }} />
      );

      const accordionButton = screen
        .getByTestId('investigationOutputTrailAccordion')
        .querySelector('button[aria-expanded]');
      expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('links query references through getReferenceHref and leaves unresolved ones as plain chips', () => {
      renderWithI18n(
        <InvestigationOutput
          status="running"
          state={treeState}
          getReferenceHref={(reference) =>
            reference.type === 'query' ? 'https://example.com/discover' : undefined
          }
        />
      );

      const queryChip = screen.getByTestId('investigationNodeReference-query');
      expect(queryChip.closest('a')).toHaveAttribute('href', 'https://example.com/discover');
      const kiChip = screen.getByTestId('investigationNodeReference-ki');
      expect(kiChip.closest('a')).toBeNull();
      expect(screen.getByText('Host disk metrics')).toBeInTheDocument();
    });
  });

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
});
