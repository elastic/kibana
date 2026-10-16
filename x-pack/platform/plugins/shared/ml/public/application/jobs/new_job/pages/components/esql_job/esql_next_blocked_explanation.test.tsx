/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import type { EsqlWizardState } from './esql_wizard_context';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';
import { EsqlNextBlockedExplanation } from './esql_next_blocked_explanation';

const Seed = ({ seed }: { seed: Partial<EsqlWizardState> }) => {
  const { setQueryProbeState, setQueryState, setHistogramState, setOutputPreviewRowCount } =
    useEsqlWizardContext();

  useEffect(() => {
    setQueryProbeState('success');
    setQueryState({
      columns: [{ name: 'bucket', type: 'date', userDefined: false }],
      emittedTimeField: 'bucket',
    });
    setHistogramState({
      histogramStatus: seed.histogramStatus ?? 'success',
      histogramTotalRows: seed.histogramTotalRows ?? 0,
      histogramErrorMessage: seed.histogramErrorMessage,
    });
    setOutputPreviewRowCount(seed.outputPreviewRowCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

const renderExplanation = (seed: Partial<EsqlWizardState>) =>
  renderWithI18n(
    <EsqlWizardProvider>
      <Seed seed={seed} />
      <EsqlNextBlockedExplanation />
    </EsqlWizardProvider>
  );

describe('EsqlNextBlockedExplanation', () => {
  it('explains that the histogram is still loading', () => {
    renderExplanation({ histogramStatus: 'loading' });

    expect(screen.getByTestId('mlEsqlNextBlockedReason')).toHaveAttribute(
      'data-reason',
      'histogramLoading'
    );
    expect(screen.getByTestId('mlEsqlNextBlockedReason')).toHaveTextContent(
      'Next is unavailable until the row-count histogram finishes loading.'
    );
  });

  it('shows the histogram error reason when the histogram query failed', () => {
    renderExplanation({
      histogramStatus: 'error',
      histogramErrorMessage: 'Unknown column [ts]',
    });

    const message = screen.getByTestId('mlEsqlNextBlockedReason');
    expect(message).toHaveAttribute('data-reason', 'histogramError');
    expect(message).toHaveTextContent('Next is unavailable because the row-count histogram failed');
    expect(message).toHaveTextContent('Unknown column [ts]');
  });

  it('suggests widening the range or adjusting the query when the histogram has no rows', () => {
    renderExplanation({ histogramStatus: 'success', histogramTotalRows: 0 });

    const message = screen.getByTestId('mlEsqlNextBlockedReason');
    expect(message).toHaveAttribute('data-reason', 'histogramEmpty');
    expect(message).toHaveTextContent('returned no rows for the selected time range');
    expect(message).toHaveTextContent('Widen the time range or adjust the query');
    expect(message).not.toHaveTextContent('preview has rows');
  });

  it('points at the time field when the preview has rows but the histogram is empty', () => {
    renderExplanation({
      histogramStatus: 'success',
      histogramTotalRows: 0,
      outputPreviewRowCount: 4,
    });

    const message = screen.getByTestId('mlEsqlNextBlockedReason');
    expect(message).toHaveAttribute('data-reason', 'histogramEmptyPreviewHasRows');
    expect(message).toHaveTextContent('the output preview has rows');
    expect(message).toHaveTextContent('the histogram, which buckets on the emitted time field');
    expect(message).toHaveTextContent('emitted time field and the source time field');
  });

  it('renders nothing when Next is enabled', () => {
    const { container } = renderExplanation({
      histogramStatus: 'success',
      histogramTotalRows: 12,
      outputPreviewRowCount: 12,
    });

    expect(screen.queryByTestId('mlEsqlNextBlockedReason')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
