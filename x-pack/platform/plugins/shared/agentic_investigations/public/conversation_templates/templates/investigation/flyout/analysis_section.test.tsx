/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { AnalysisSection, hasAnalysis, type InvestigationAnalysis } from './analysis_section';

jest.mock('../../../../evidence/evidence_chart', () => ({
  EvidenceChart: ({ chart }: { chart: { title: string } }) => <div>{chart.title}</div>,
}));
jest.mock('../../../../component_diagram/attachments/component_diagram_view', () => ({
  ComponentDiagramContent: ({ diagram }: { diagram: { problemNodeIds: string[] } }) => (
    <div data-test-subj="mockComponentDiagram">{diagram.problemNodeIds.join(',')}</div>
  ),
}));

const analysis: InvestigationAnalysis = {
  timeline: {
    events: [
      {
        timestamp: '2026-07-28T14:00:00Z',
        title: 'checkout v2.3.1 deployed',
        type: 'change',
        evidence: { description: 'Rolled out to every pod.' },
      },
      { timestamp: '2026-07-28T14:02:00Z', title: 'Checkout errors rise', type: 'symptom' },
    ],
    created_at: 'x',
  },
  component_diagram: {
    title: 'Checkout write path',
    mermaid: 'flowchart LR\na-->b',
    problem_node_ids: ['b'],
    created_at: 'x',
  },
  trace: {
    steps: [
      { type: 'symptom', label: 'Checkout errors at 12%' },
      { type: 'end', label: 'Root cause: pool size', finding: 'The pool holds **20**.' },
    ],
    decision_tree: 'checkout-errors.md',
    created_at: 'x',
  },
};

const renderSection = (data: InvestigationAnalysis = analysis) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <AnalysisSection analysis={data} />
      </I18nProvider>
    </EuiProvider>
  );

describe('AnalysisSection', () => {
  it('lists one row per artifact without rendering any of them', () => {
    renderSection();

    expect(screen.getByText('Timeline · 2 events')).toBeInTheDocument();
    expect(screen.getByText('Component diagram · Checkout write path')).toBeInTheDocument();
    expect(screen.getByText('Investigation trace · 2 steps')).toBeInTheDocument();
    expect(screen.queryByText('checkout v2.3.1 deployed')).not.toBeInTheDocument();
  });

  it('opens the timeline in a nested flyout', async () => {
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: /Timeline · 2 events/ }));

    expect(await screen.findByText('checkout v2.3.1 deployed')).toBeInTheDocument();
    expect(screen.getByText('Rolled out to every pod.')).toBeInTheDocument();
    expect(screen.getByTestId('investigationAnalysisFlyout-timeline')).toBeInTheDocument();
  });

  it('opens the component diagram with its problem nodes', async () => {
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: /Component diagram/ }));

    expect(await screen.findByTestId('mockComponentDiagram')).toHaveTextContent('b');
  });

  it('opens the trace with its decision tree and findings', async () => {
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: /Investigation trace/ }));

    expect(await screen.findByText('Root cause: pool size')).toBeInTheDocument();
    expect(screen.getByText('Followed decision tree checkout-errors.md')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('leaves out empty artifacts', () => {
    const empty = { timeline: { events: [], created_at: 'x' } };

    expect(hasAnalysis(empty)).toBe(false);
    expect(hasAnalysis({ trace: analysis.trace })).toBe(true);
  });
});
