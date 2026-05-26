/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import type { TestRenderer } from '../../../../mock';
import { createFleetTestRendererMock } from '../../../../mock';
import type { Agent } from '../../../../../common/types';

import { CollectorDetail } from './collector_detail';

jest.mock('./collector_detail_logs', () => ({
  CollectorDetailLogs: () => <div data-test-subj="collectorDetailLogs">Logs content</div>,
}));

const makeAgent = (overrides?: Partial<Agent>): Agent =>
  ({
    id: 'opamp-collector-001',
    type: 'OPAMP',
    active: true,
    enrolled_at: '2026-04-01T10:00:00Z',
    local_metadata: {
      host: { hostname: 'collector-prod-west-1' },
      elastic: { agent: { version: '9.4.0' } },
    },
    status: 'online',
    packages: [],
    health: {
      healthy: true,
      status: 'StatusOK',
      status_time_unix_nano: 1777926000000000000,
      component_health_map: {
        'receiver:otlp': { healthy: true, status: 'StatusOK' },
      },
    },
    identifying_attributes: { 'service.name': 'otel-gateway' },
    non_identifying_attributes: { 'elastic.display.name': 'prod-west-gateway' },
    capabilities: ['logs', 'metrics', 'traces'],
    ...overrides,
  } as Agent);

describe('CollectorDetail', () => {
  let testRenderer: TestRenderer;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  it('renders three tabs: Health, Logs, Info', () => {
    const result = testRenderer.render(<CollectorDetail agents={[makeAgent()]} />);

    expect(result.getByTestId('collectorDetailTab-health')).toBeInTheDocument();
    expect(result.getByTestId('collectorDetailTab-logs')).toBeInTheDocument();
    expect(result.getByTestId('collectorDetailTab-info')).toBeInTheDocument();
  });

  it('shows Health tab by default', () => {
    const result = testRenderer.render(<CollectorDetail agents={[makeAgent()]} />);

    expect(result.getByTestId('collectorDetailTab-health')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(result.getByTestId('collectorDetailHealth')).toBeInTheDocument();
  });

  it('switches to Logs tab', () => {
    const result = testRenderer.render(<CollectorDetail agents={[makeAgent()]} />);

    fireEvent.click(result.getByTestId('collectorDetailTab-logs'));
    expect(result.getByTestId('collectorDetailLogs')).toBeInTheDocument();
    expect(result.queryByTestId('collectorDetailHealth')).not.toBeInTheDocument();
  });

  it('switches to Info tab', () => {
    const result = testRenderer.render(<CollectorDetail agents={[makeAgent()]} />);

    fireEvent.click(result.getByTestId('collectorDetailTab-info'));
    expect(result.getByTestId('collectorDetailInfo')).toBeInTheDocument();
    expect(result.queryByTestId('collectorDetailHealth')).not.toBeInTheDocument();
  });

  it('shows no-data message when health is undefined', () => {
    const result = testRenderer.render(
      <CollectorDetail agents={[makeAgent({ health: undefined })]} />
    );

    expect(result.getByTestId('collectorDetailHealthNoData')).toBeInTheDocument();
  });

  it('shows singular title for one collector', () => {
    const result = testRenderer.render(<CollectorDetail agents={[makeAgent()]} />);
    expect(result.getByText('Collector')).toBeInTheDocument();
  });

  it('shows plural title and selector for multiple collectors', () => {
    const agents = [
      makeAgent(),
      makeAgent({
        id: 'opamp-collector-002',
        non_identifying_attributes: { 'elastic.display.name': 'prod-east-gateway' },
      }),
    ];
    const result = testRenderer.render(<CollectorDetail agents={agents} />);

    expect(result.getByText('Collectors (2)')).toBeInTheDocument();
    expect(result.getByTestId('collectorDetailSelector')).toBeInTheDocument();
  });

  it('hides selector for single collector', () => {
    const result = testRenderer.render(<CollectorDetail agents={[makeAgent()]} />);
    expect(result.queryByTestId('collectorDetailSelector')).not.toBeInTheDocument();
  });
});
