/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { noDataStrategy } from '@kbn/alerting-v2-schemas';
import { QueryPipelineExplainer } from './query_pipeline_explainer';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, dataTestSubj }: { value: string; dataTestSubj?: string }) => (
    <pre data-test-subj={dataTestSubj ?? 'mockCodeEditor'}>{value}</pre>
  ),
  ESQL_LANG_ID: 'esql',
}));

jest.mock('@kbn/esql-utils', () => ({
  prettifyQuery: (query: string) => query,
}));

const renderExplainer = (props: React.ComponentProps<typeof QueryPipelineExplainer> = {}) =>
  render(
    <IntlProvider locale="en">
      <QueryPipelineExplainer demo {...props} />
    </IntlProvider>
  );

describe('QueryPipelineExplainer', () => {
  it('renders collapsed teaser with chips and section title', () => {
    renderExplainer({ defaultExpanded: false });

    expect(screen.getByTestId('queryPipelineExplainer')).toBeInTheDocument();
    expect(screen.getByText('How a rule runs queries')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('Recovery')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(
      screen.getByText('Universal runs more than the query in the editor.')
    ).toBeInTheDocument();
    // Expanded body stays mounted under EuiAccordion; Classic footer is only for the open state.
    expect(screen.getByText('How a rule runs queries')).toBeInTheDocument();
  });

  it('expands to show pipeline map, Alert selected with segment highlight, and Classic footer', () => {
    renderExplainer({ forceExpanded: true });

    expect(screen.getByTestId('queryPipelineMap')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineStep-base')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineStep-alert')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineStep-recovery')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineStep-noData')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineActiveTitle')).toHaveTextContent('Alert query');
    expect(screen.getByTestId('queryPipelineActiveQuery')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineQueryHighlight')).toHaveTextContent(
      'WHERE avg_cpu_pct > 85'
    );
    expect(screen.getByTestId('queryPipelineVisual-alert')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineClassicFooter')).toHaveTextContent(
      'Universal exposes this query pipeline'
    );
    expect(screen.queryByText(/breach/i)).not.toBeInTheDocument();
  });

  it('docks step detail inside the canvas panel when layout is canvas', () => {
    renderExplainer({ forceExpanded: true, layout: 'canvas' });

    expect(screen.getByTestId('queryPipelineDetailPanel')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineActiveTitle')).toHaveTextContent('Alert query');
    expect(screen.getByTestId('queryPipelineActiveQuery')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineVisual-alert')).toBeInTheDocument();
  });

  it('places map and detail side by side when layout is split', () => {
    renderExplainer({ forceExpanded: true, layout: 'split' });

    expect(screen.getByTestId('queryPipelineSplitLayout')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineMap')).toBeInTheDocument();
    expect(screen.queryByTestId('queryPipelineDetailPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineActiveTitle')).toHaveTextContent('Alert query');
    expect(screen.getByTestId('queryPipelineActiveQuery')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineVisual-alert')).toBeInTheDocument();
  });

  it('switches the active step when a pipeline node is selected', () => {
    renderExplainer({ forceExpanded: true });

    fireEvent.click(screen.getByTestId('queryPipelineStep-base'));
    expect(screen.getByTestId('queryPipelineActiveTitle')).toHaveTextContent('Base query');
    expect(screen.getByTestId('queryPipelineVisual-base')).toBeInTheDocument();
    // Base has no segment — the full query is the selected highlight.
    expect(screen.getByTestId('queryPipelineQueryHighlight')).toHaveTextContent('FROM metrics-*');
    expect(screen.queryByTestId('queryPipelineQueryMuted')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('queryPipelineStep-recovery'));
    expect(screen.getByTestId('queryPipelineActiveTitle')).toHaveTextContent('Recovery query');
    expect(screen.getByTestId('queryPipelineQueryHighlight')).toHaveTextContent(
      'WHERE avg_cpu_pct <= 85'
    );
    expect(screen.getByTestId('queryPipelineQueryMuted')).toBeInTheDocument();
  });

  it('shows the no-data diagram and View full query when the presence query is complex', () => {
    const longBase = Array.from({ length: 45 }, (_, i) => `| EVAL col${i} = ${i}`).join('\n');
    render(
      <IntlProvider locale="en">
        <QueryPipelineExplainer
          forceExpanded
          query={{ base: `FROM metrics-*\n${longBase}`, breach: { segment: 'WHERE x > 1' } }}
          noData={{ strategy: noDataStrategy.keep_last }}
        />
      </IntlProvider>
    );

    fireEvent.click(screen.getByTestId('queryPipelineStep-noData'));
    expect(screen.getByTestId('queryPipelineNoDataDiagram')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineViewFullNoDataQuery')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('queryPipelineViewFullNoDataQuery'));
    expect(screen.getByTestId('queryPipelineActiveQuery')).toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineHideFullNoDataQuery')).toBeInTheDocument();
  });

  it('uses live query props when demo is false', () => {
    render(
      <IntlProvider locale="en">
        <QueryPipelineExplainer
          forceExpanded
          query={{
            base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
            breach: { segment: 'WHERE c > 10' },
          }}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('queryPipelineActiveQuery')).toHaveTextContent('WHERE c > 10');
  });
});
