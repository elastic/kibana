/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { useMlKibana } from '../../../../../contexts/kibana';
import { EsqlHistogramChart } from './esql_histogram_chart';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: jest.fn(),
}));

const mockedUseMlKibana = jest.mocked(useMlKibana);

const SeedHistogramState = ({
  histogramStatus,
  histogramTotalRows = 0,
  histogramErrorMessage,
  histogramSeries = [],
}: {
  histogramStatus: 'idle' | 'loading' | 'success' | 'error';
  histogramTotalRows?: number;
  histogramErrorMessage?: string;
  histogramSeries?: Array<{ time: number; value: number }>;
}) => {
  const { setHistogramState } = useEsqlWizardContext();

  useEffect(() => {
    setHistogramState({
      histogramStatus,
      histogramTotalRows,
      histogramErrorMessage,
      histogramSeries,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

describe('EsqlHistogramChart', () => {
  beforeEach(() => {
    mockedUseMlKibana.mockReturnValue({
      services: { charts: { theme: { useChartsBaseTheme: () => ({}) } } },
    } as unknown as ReturnType<typeof useMlKibana>);
  });

  it('shows the histogram error when the histogram execution failed', () => {
    renderWithI18n(
      <EsqlWizardProvider>
        <SeedHistogramState histogramStatus="error" histogramErrorMessage="esql failure" />
        <EsqlHistogramChart />
      </EsqlWizardProvider>
    );

    expect(screen.getByTestId('mlEsqlHistogramError')).toHaveTextContent('esql failure');
    expect(screen.queryByTestId('mlEsqlHistogramChart')).not.toBeInTheDocument();
  });

  it('renders nothing when the histogram succeeded with zero rows (the output preview owns the empty state)', () => {
    const { container } = renderWithI18n(
      <EsqlWizardProvider>
        <SeedHistogramState histogramStatus="success" histogramTotalRows={0} />
        <EsqlHistogramChart />
      </EsqlWizardProvider>
    );

    expect(screen.queryByTestId('mlEsqlHistogramEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mlEsqlHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mlEsqlHistogramError')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the chart and total row count once the histogram has rows', () => {
    renderWithI18n(
      <EsqlWizardProvider>
        <SeedHistogramState
          histogramStatus="success"
          histogramTotalRows={8}
          histogramSeries={[{ time: 0, value: 8 }]}
        />
        <EsqlHistogramChart />
      </EsqlWizardProvider>
    );

    expect(screen.getByTestId('mlEsqlHistogramChart')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlHistogramTotalRows')).toHaveTextContent('8 rows');
  });
});
