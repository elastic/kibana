/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TestRenderer } from '../../../../mock';
import { createFleetTestRendererMock } from '../../../../mock';
import type { ComponentHealth } from '../../../../../common/types';

import { CollectorDetailHealth } from './collector_detail_health';

describe('CollectorDetailHealth', () => {
  let testRenderer: TestRenderer;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  it('renders no-data message when health is undefined', () => {
    const result = testRenderer.render(<CollectorDetailHealth />);
    expect(result.getByTestId('collectorDetailHealthNoData')).toBeInTheDocument();
  });

  it('renders healthy status', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      status_time_unix_nano: 1777926000000000000,
      component_health_map: {
        'receiver:otlp': { healthy: true, status: 'StatusOK' },
        'processor:batch': { healthy: true, status: 'StatusOK' },
      },
    };

    const result = testRenderer.render(<CollectorDetailHealth health={health} />);
    const panel = result.getByTestId('collectorDetailHealth');
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toContain('Healthy');
    expect(panel.textContent).toContain('StatusOK');
  });

  it('renders unhealthy status with error', () => {
    const health: ComponentHealth = {
      healthy: false,
      status: 'StatusRecoverableError',
      status_time_unix_nano: 1777925000000000000,
      last_error: 'connection refused',
      component_health_map: {
        'receiver:otlp': { healthy: true, status: 'StatusOK' },
        'exporter:elasticsearch/default': {
          healthy: false,
          status: 'StatusRecoverableError',
          last_error: 'connection refused',
        },
      },
    };

    const result = testRenderer.render(<CollectorDetailHealth health={health} />);
    const panel = result.getByTestId('collectorDetailHealth');
    expect(panel.textContent).toContain('Unhealthy');
    expect(panel.textContent).toContain('connection refused');
  });

  it('renders component breakdown', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'receiver:otlp': { healthy: true, status: 'StatusOK' },
        'processor:batch': { healthy: true, status: 'StatusOK' },
        'exporter:elasticsearch/default': { healthy: true, status: 'StatusOK' },
      },
    };

    const result = testRenderer.render(<CollectorDetailHealth health={health} />);
    expect(result.getByText('receiver:otlp')).toBeInTheDocument();
    expect(result.getByText('processor:batch')).toBeInTheDocument();
    expect(result.getByText('exporter:elasticsearch/default')).toBeInTheDocument();
  });
});
