/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { DispatchOptionDiagram } from './dispatch_option_diagram';

const renderDiagram = (overrides: {
  groupingMode?: GroupingMode;
  groupBy?: string[];
  throttleStrategy?: ThrottleStrategy;
  throttleInterval?: string;
}) =>
  render(
    <DispatchOptionDiagram
      groupingMode={overrides.groupingMode ?? 'per_episode'}
      groupBy={overrides.groupBy ?? []}
      throttleStrategy={overrides.throttleStrategy ?? 'on_status_change'}
      throttleInterval={overrides.throttleInterval ?? ''}
    />
  );

describe('DispatchOptionDiagram', () => {
  it('renders timeline labels for per alert on status change without a footer', () => {
    renderDiagram({ groupingMode: 'per_episode', throttleStrategy: 'on_status_change' });

    expect(screen.getByTestId('dispatchOptionDiagram')).toBeInTheDocument();
    expect(screen.queryByTestId('dispatchOptionDiagramFooter')).not.toBeInTheDocument();
    expect(screen.getByText('Opens')).toBeInTheDocument();
    expect(screen.getByText('Recovers')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders group-by multi-row labels', () => {
    renderDiagram({
      groupingMode: 'per_field',
      groupBy: ['service', 'env'],
      throttleStrategy: 'every_time',
    });

    expect(screen.getByText('group:A')).toBeInTheDocument();
    expect(screen.getByText('group:B')).toBeInTheDocument();
    expect(screen.getByText('group:C')).toBeInTheDocument();
  });

  it('renders digest row label for bundle all', () => {
    renderDiagram({ groupingMode: 'all', throttleStrategy: 'time_interval' });

    expect(screen.getByText('all alerts')).toBeInTheDocument();
  });
});
