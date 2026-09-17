/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationState } from '@kbn/significant-events-schema';
import type { GetInvestigationResponse } from '../../common';
import { InvestigationDetailFlyout } from './investigation_detail_flyout';

const investigation = (
  overrides: Partial<GetInvestigationResponse> = {}
): GetInvestigationResponse => ({
  investigation_id: 'exec-1',
  subject: { type: 'manual', id: 'manual' },
  status: 'running',
  created_at: '2026-09-15T12:00:00.000Z',
  started_at: '2026-09-15T12:00:01.000Z',
  ...overrides,
});

const renderFlyout = ({
  inv,
  progress,
}: {
  inv: GetInvestigationResponse;
  progress?: InvestigationState;
}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <InvestigationDetailFlyout
          investigation={inv}
          isLoading={false}
          error={null}
          onClose={jest.fn()}
          progress={progress}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('InvestigationDetailFlyout', () => {
  it('shows the live snapshot while the run has nothing persisted yet', () => {
    renderFlyout({
      inv: investigation(),
      progress: {
        summary: 'Checking the checkout latency spike',
        hypotheses: [
          { candidate: 'Connection pool exhaustion', confidence: 0.6, status: 'investigating' },
        ],
      },
    });

    expect(screen.getByText('Checking the checkout latency spike')).toBeInTheDocument();
    expect(screen.getByText('Connection pool exhaustion')).toBeInTheDocument();
  });

  it('holds back a mid-run conclusion, which is still a draft', () => {
    renderFlyout({
      inv: investigation(),
      progress: {
        summary: 'Still narrowing it down',
        hypotheses: [],
        conclusion: 'Probably the pool size change',
      },
    });

    expect(screen.queryByText('Probably the pool size change')).not.toBeInTheDocument();
  });

  it('shows the conclusion once the run has ended', () => {
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        summary: 'Pool size change caused the spike',
        hypotheses: [],
        conclusion: 'The pool size change caused the spike',
      }),
    });

    expect(screen.getByText('The pool size change caused the spike')).toBeInTheDocument();
  });

  it('keeps the persisted result when a late snapshot arrives after completion', () => {
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        summary: 'Pool size change caused the spike',
        hypotheses: [],
      }),
      progress: { summary: 'Still narrowing it down', hypotheses: [] },
    });

    expect(screen.getByText('Pool size change caused the spike')).toBeInTheDocument();
    expect(screen.queryByText('Still narrowing it down')).not.toBeInTheDocument();
  });

  it('tells the user it is working when a live run has produced nothing yet', () => {
    renderFlyout({ inv: investigation() });

    expect(
      screen.getByTestId('nightshiftInvestigationDetailFlyoutProgressPending')
    ).toBeInTheDocument();
  });

  it('hides the subject of a manual run, which points at no entity', () => {
    renderFlyout({ inv: investigation({ subject: { type: 'manual', id: 'manual' } }) });

    expect(screen.queryByText('Subject')).not.toBeInTheDocument();
  });

  it('keeps the subject when the caller named one', () => {
    renderFlyout({
      inv: investigation({ subject: { type: 'manual', id: 'checkout-latency' } }),
    });

    expect(screen.getByText('Subject')).toBeInTheDocument();
    // Also the headline, which falls back to the subject id, hence more than one match.
    expect(screen.getAllByTitle('checkout-latency').length).toBeGreaterThan(0);
  });

  it('keeps the subject for a run that does point at an entity', () => {
    renderFlyout({ inv: investigation({ subject: { type: 'alert', id: 'alert-42' } }) });

    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getAllByTitle('alert-42').length).toBeGreaterThan(0);
  });

  it('does not claim to be working once the run has ended', () => {
    renderFlyout({
      inv: investigation({ status: 'completed', completed_at: '2026-09-15T12:10:00.000Z' }),
    });

    expect(
      screen.queryByTestId('nightshiftInvestigationDetailFlyoutProgressPending')
    ).not.toBeInTheDocument();
  });
});
