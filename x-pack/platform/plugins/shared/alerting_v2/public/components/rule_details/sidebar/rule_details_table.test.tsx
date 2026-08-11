/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuleDetailsTable } from './rule_details_table';

describe('RuleDetailsTable', () => {
  it('renders each item as a row with title and description', () => {
    render(
      <RuleDetailsTable
        items={[
          { title: 'Data source', description: 'logs-*' },
          { title: 'Schedule', description: 'Every 5m' },
        ]}
      />
    );

    expect(screen.getByText('Data source')).toBeInTheDocument();
    expect(screen.getByText('logs-*')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Every 5m')).toBeInTheDocument();
  });

  it('forwards data-test-subj to the description cell', () => {
    render(
      <RuleDetailsTable
        items={[{ title: 'Mode', description: 'Alert', 'data-test-subj': 'myTestId' }]}
      />
    );

    expect(screen.getByTestId('myTestId')).toHaveTextContent('Alert');
  });

  it('renders arbitrary ReactNode descriptions', () => {
    render(
      <RuleDetailsTable
        items={[
          {
            title: 'Recovery',
            description: <div data-test-subj="customDescription">Custom</div>,
          },
        ]}
      />
    );

    expect(screen.getByTestId('customDescription')).toHaveTextContent('Custom');
  });

  it('renders a full-width row spanning both columns when fullWidthContent is provided', () => {
    render(
      <RuleDetailsTable
        items={[
          {
            title: 'Recovery',
            description: 'Custom',
            'data-test-subj': 'recoveryRow',
            fullWidthContent: <div data-test-subj="recoverySnippet">FROM logs-*</div>,
          },
        ]}
      />
    );

    const cell = screen.getByTestId('recoveryRow');
    expect(cell).toHaveAttribute('colspan', '2');
    expect(cell).toHaveTextContent('Recovery');
    expect(cell).toHaveTextContent('Custom');
    expect(screen.getByTestId('recoverySnippet')).toHaveTextContent('FROM logs-*');
  });

  it('keeps unrelated rows in the normal two-column layout alongside a full-width row', () => {
    render(
      <RuleDetailsTable
        items={[
          { title: 'Mode', description: 'Alert', 'data-test-subj': 'modeRow' },
          {
            title: 'Recovery',
            description: 'Custom',
            'data-test-subj': 'recoveryRow',
            fullWidthContent: <div data-test-subj="recoverySnippet">FROM logs-*</div>,
          },
        ]}
      />
    );

    expect(screen.getByTestId('modeRow')).not.toHaveAttribute('colspan');
    expect(screen.getByTestId('recoveryRow')).toHaveAttribute('colspan', '2');
  });
});
