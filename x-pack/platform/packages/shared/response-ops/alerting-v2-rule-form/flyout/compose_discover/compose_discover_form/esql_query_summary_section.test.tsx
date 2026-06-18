/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EsqlQuerySummarySection } from './esql_query_summary_section';

const defaultBlocks = [
  {
    id: 'base',
    label: 'Base query',
    query: 'FROM logs-*\n| STATS count = COUNT(*) BY host.name',
    emptyMessage: 'No base query defined',
  },
  {
    id: 'alert',
    label: 'Alert condition',
    query: '| WHERE count > 100',
    emptyMessage: 'No alert condition defined',
  },
];

const renderSection = (overrides: Partial<React.ComponentProps<typeof EsqlQuerySummarySection>> = {}) =>
  render(
    <I18nProvider>
      <EsqlQuerySummarySection
        description="Search query and alert condition identified"
        blocks={defaultBlocks}
        editButtonLabel="Edit query"
        onEdit={jest.fn()}
        editTestSubj="composeDiscoverEditQuery"
        {...overrides}
      />
    </I18nProvider>
  );

describe('EsqlQuerySummarySection', () => {
  it('renders the split panel with title, description, and query blocks', () => {
    renderSection();

    expect(screen.getByTestId('composeDiscoverEsqlQuerySection')).toBeInTheDocument();
    expect(screen.getByText('ES|QL query')).toBeInTheDocument();
    expect(screen.getByText('Search query and alert condition identified')).toBeInTheDocument();
    expect(screen.getByText('Base query')).toBeInTheDocument();
    expect(screen.getByText('Alert condition')).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-base')).toHaveTextContent('FROM logs-*');
    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-alert')).toHaveTextContent(
      '| WHERE count > 100'
    );
    expect(screen.getByTestId('composeDiscoverEditQuery')).toBeInTheDocument();
  });

  it('renders the empty state with open editor action', () => {
    renderSection({
      description: 'Open the editor to write your ES|QL query',
      isEmpty: true,
      emptyAction: {
        label: 'Open query editor',
        onClick: jest.fn(),
        testSubj: 'composeDiscoverOpenEditor',
      },
      blocks: [],
    });

    expect(screen.getByText('Open the editor to write your ES|QL query')).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverOpenEditor')).toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverEsqlQuerySectionToggle')).not.toBeInTheDocument();
  });

  it('renders a callout inside the section body', () => {
    renderSection({
      callout: <div data-test-subj="composeDiscoverTestCallout">Split failed</div>,
    });

    expect(screen.getByTestId('composeDiscoverTestCallout')).toBeInTheDocument();
    expect(screen.getByTestId('composeDiscoverEsqlQuerySection')).toContainElement(
      screen.getByTestId('composeDiscoverTestCallout')
    );
  });

  it('keeps long query blocks visible with scroll overflow instead of a collapse control', () => {
    const longQuery = Array.from({ length: 10 }, (_, i) => `| WHERE field${i} == ${i}`).join('\n');
    renderSection({
      blocks: [
        {
          id: 'base',
          label: 'Base query',
          query: longQuery,
          emptyMessage: 'No base query defined',
        },
      ],
    });

    expect(screen.getByTestId('composeDiscoverEsqlQueryBlock-base')).toBeInTheDocument();
    expect(screen.queryByTestId('composeDiscoverEsqlQuerySectionToggle')).not.toBeInTheDocument();
  });
});
