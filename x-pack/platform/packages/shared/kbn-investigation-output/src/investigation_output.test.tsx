/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  recommendations: [
    {
      title: 'Roll back the deployment that introduced the regression',
      confidence: 0.95,
      description: 'Restore the last known-good checkout deployment.',
      code: 'kubectl rollout undo deployment/checkout-service',
    },
    {
      title: 'Add a connection-pool saturation alert',
      confidence: 0.7,
      description: 'Alert before queued checkout requests begin to time out.',
    },
  ],
  blind_spots: [
    {
      title: 'No profiling data available',
      confidence: 0.7,
      description: 'Could not confirm whether a leak compounded the exhaustion.',
    },
    {
      title: 'No database query samples available',
      confidence: 0.6,
      description: 'Could not rule out a slower query path after the deployment.',
    },
  ],
};

const finalStateWithTriggerFeedback: InvestigationState = {
  ...finalState,
  trigger_feedback: [
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

  it('renders structured final findings without numeric confidence', () => {
    renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

    expect(screen.getByText('Investigation complete')).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputHypothesisStatus-confirmed')).toBeInTheDocument();

    const finalResults = screen.getByTestId('investigationOutputFinalResults');
    expect(finalResults).toBeInTheDocument();
    expect(finalResults).toHaveTextContent(
      'A deploy at 14:02 introduced a connection leak in the checkout service.'
    );
    expect(finalResults).toHaveTextContent('Proposed actions');
    expect(finalResults).toHaveTextContent(
      'Roll back the deployment that introduced the regression'
    );
    expect(finalResults).toHaveTextContent('Recommended');
    expect(finalResults).toHaveTextContent('Blind spots');
    expect(finalResults).toHaveTextContent('2 identified');
    expect(finalResults).toHaveTextContent('No profiling data available');
    expect(finalResults).toHaveTextContent('Most impactful');
    expect(finalResults).not.toHaveTextContent('95%');
  });

  it('renders non-interactive inline markdown in titles', async () => {
    const user = userEvent.setup();
    const stateWithMarkdown: InvestigationState = {
      ...finalState,
      recommendations: [
        {
          title:
            '**Block the attacker IPs** at the firewall via `hosts.deny` and [runbook](https://example.com)',
          confidence: 0.9,
        },
      ],
      blind_spots: [
        { title: 'No `apm-*` indices', confidence: 0.8, description: 'Needed for _tracing_.' },
      ],
    };

    renderWithI18n(<InvestigationOutput status="complete" state={stateWithMarkdown} />);

    const finalResults = screen.getByTestId('investigationOutputFinalResults');
    expect(finalResults).toHaveTextContent(
      'Block the attacker IPs at the firewall via hosts.deny and runbook'
    );
    expect(finalResults).not.toHaveTextContent('**');
    expect(screen.getByText('Block the attacker IPs').tagName).toBe('STRONG');
    expect(screen.getByText('hosts.deny').tagName).toBe('CODE');
    expect(screen.queryByRole('link', { name: 'runbook' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Block the attacker IPs/ })
    ).not.toBeInTheDocument();
    expect(finalResults).toHaveTextContent('No apm-* indices');

    const blindSpotButton = screen.getByRole('button', { name: /No apm/ });
    expect(blindSpotButton.querySelector('a, div, p, button')).toBeNull();
    await user.click(blindSpotButton);

    expect(finalResults).toHaveTextContent('Needed for tracing.');
  });

  it('renders a recovered blind spot once when its title and description are the same sentence', () => {
    const gap = 'No GeoIP enrichment available for the attacker IPs.';
    const stateWithRecoveredGap: InvestigationState = {
      ...finalState,
      blind_spots: [{ title: gap, confidence: 0.8, description: gap }],
    };

    renderWithI18n(<InvestigationOutput status="complete" state={stateWithRecoveredGap} />);

    const blindSpots = screen.getByTestId('investigationOutputBlindSpots');
    expect(blindSpots.textContent?.match(/No GeoIP enrichment/g)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: gap })).not.toBeInTheDocument();
  });

  it('opens recommendation details with a click and blind-spot details from a collapsed accordion', async () => {
    const user = userEvent.setup();
    renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

    const recommendations = screen.getByTestId('investigationOutputRecommendations');
    expect(recommendations).toHaveTextContent(
      'Roll back the deployment that introduced the regression'
    );
    const action = screen.getByRole('button', {
      name: /Roll back the deployment that introduced the regression/,
    });
    expect(action.querySelector('a, div, p, button')).toBeNull();
    await user.click(action);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'kubectl rollout undo deployment/checkout-service'
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Restore the last known-good checkout deployment.'
    );

    const blindSpots = screen.getByTestId('investigationOutputBlindSpots');
    expect(blindSpots).toHaveTextContent('No profiling data available');
    const firstBlindSpot = screen.getByRole('button', { name: /No profiling data available/ });
    expect(firstBlindSpot).toHaveAttribute('aria-expanded', 'false');

    await user.click(firstBlindSpot);

    expect(firstBlindSpot).toHaveAttribute('aria-expanded', 'true');
    expect(blindSpots).toHaveTextContent(
      'Could not confirm whether a leak compounded the exhaustion.'
    );
    expect(recommendations).not.toContainElement(blindSpots);
  });

  it('opens recommendation details with the keyboard and returns focus on close', async () => {
    const user = userEvent.setup();
    renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

    const action = screen.getByRole('button', {
      name: /Roll back the deployment that introduced the regression/,
    });
    action.focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Roll back the deployment that introduced the regression');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(action).toHaveFocus();
  });

  it('does not retain recommendation details after the recommendations change', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithI18n(
      <InvestigationOutput status="complete" state={finalState} />
    );

    await user.click(
      screen.getByRole('button', {
        name: /Roll back the deployment that introduced the regression/,
      })
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <I18nProvider>
        <InvestigationOutput
          status="complete"
          state={{
            ...finalState,
            recommendations: [{ title: 'Inspect the new investigation', confidence: 0.8 }],
          }}
        />
      </I18nProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the conclusion on its own when no recommendations or blind spots were reported', () => {
    const conclusionOnly: InvestigationState = {
      summary: finalState.summary,
      hypotheses: finalState.hypotheses,
      conclusion: finalState.conclusion,
    };

    renderWithI18n(<InvestigationOutput status="complete" state={conclusionOnly} />);

    expect(screen.getByTestId('investigationOutputFinalResults')).toHaveTextContent(
      'A deploy at 14:02 introduced a connection leak in the checkout service.'
    );
    expect(screen.queryByTestId('investigationOutputRecommendations')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investigationOutputBlindSpots')).not.toBeInTheDocument();
  });

  it('renders no final results block when a complete investigation reported none of the three', () => {
    const withoutFinalResults: InvestigationState = {
      summary: finalState.summary,
      hypotheses: finalState.hypotheses,
    };

    renderWithI18n(<InvestigationOutput status="complete" state={withoutFinalResults} />);

    expect(screen.queryByTestId('investigationOutputFinalResults')).not.toBeInTheDocument();
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

  describe('trigger_feedback', () => {
    it('renders the proposed updates block with a severity and a status row when complete', () => {
      renderWithI18n(
        <InvestigationOutput status="complete" state={finalStateWithTriggerFeedback} />
      );

      expect(screen.getByTestId('investigationTriggerFeedback')).toBeInTheDocument();

      const severityRow = screen.getByTestId('investigationTriggerFeedback-severity');
      expect(severityRow).toHaveTextContent('Medium');
      expect(severityRow).toHaveTextContent('Critical');
      expect(severityRow).toHaveTextContent('Checkout is fully blocked for every user');
      expect(severityRow).toHaveTextContent('Zero successful checkout completions');
      expect(severityRow).toHaveTextContent('FROM traces | WHERE service.name == "checkout"');
      expect(severityRow).toHaveTextContent('All checkout pods in CrashLoopBackOff');

      const statusRow = screen.getByTestId('investigationTriggerFeedback-status');
      expect(statusRow).toHaveTextContent('Open');
      expect(statusRow).toHaveTextContent('Dismissed');
      expect(statusRow).toHaveTextContent('No actual failure was found');
    });

    it('renders a summary update as From/To free text (non-badge field)', () => {
      renderWithI18n(
        <InvestigationOutput status="complete" state={finalStateWithTriggerFeedback} />
      );

      const summaryRow = screen.getByTestId('investigationTriggerFeedback-summary');
      expect(summaryRow).toHaveTextContent('From: Checkout latency is elevated.');
      expect(summaryRow).toHaveTextContent('To: Checkout is fully unavailable');
      expect(summaryRow).toHaveTextContent('The triaged summary understated the impact.');
    });

    it('does not render the updates block when there are no updates', () => {
      renderWithI18n(<InvestigationOutput status="complete" state={finalState} />);

      expect(screen.queryByTestId('investigationTriggerFeedback')).not.toBeInTheDocument();
    });

    it('does not render the updates block while the investigation is still running', () => {
      renderWithI18n(
        <InvestigationOutput status="running" state={finalStateWithTriggerFeedback} />
      );

      expect(screen.queryByTestId('investigationTriggerFeedback')).not.toBeInTheDocument();
    });
  });
});
