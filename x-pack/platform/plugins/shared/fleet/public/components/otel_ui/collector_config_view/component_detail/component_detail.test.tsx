/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { OTelCollectorConfig, ComponentHealth } from '../../../../../common/types';

import { OTelComponentDetail } from './component_detail';

const config: OTelCollectorConfig = {
  receivers: {
    otlp: {
      protocols: {
        grpc: { endpoint: '0.0.0.0:4317' },
        http: { endpoint: '0.0.0.0:4318' },
      },
    },
    'hostmetrics/system': {
      collection_interval: '10s',
      scrapers: { cpu: {}, memory: {} },
    },
  },
  processors: {
    batch: {
      timeout: '1s',
      send_batch_size: 1024,
    },
    nop: undefined,
  },
  exporters: {
    'elasticsearch/default': {
      endpoints: ['https://localhost:9200'],
    },
  },
  service: {
    pipelines: {
      'logs/default': {
        receivers: ['otlp'],
        processors: ['batch'],
        exporters: ['elasticsearch/default'],
      },
    },
  },
};

describe('OTelComponentDetail', () => {
  it('renders the component title with type label and ID', () => {
    render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/Receiver: otlp/)).toBeInTheDocument();
  });

  it('renders the component configuration as YAML', () => {
    render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/protocols:/)).toBeInTheDocument();
    expect(screen.getByText(/grpc:/)).toBeInTheDocument();
    expect(screen.getByText(/0.0.0.0:4317/)).toBeInTheDocument();
  });

  it('renders "No additional configuration" when component has no config', () => {
    const minimalConfig: OTelCollectorConfig = {
      receivers: { noop: null },
      service: { pipelines: {} },
    };

    render(
      <OTelComponentDetail
        componentId="noop"
        componentType="receiver"
        config={minimalConfig}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('No additional configuration')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();

    render(
      <OTelComponentDetail
        componentId="batch"
        componentType="processor"
        config={config}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('otelComponentDetailCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders exporter configuration correctly', () => {
    render(
      <OTelComponentDetail
        componentId="elasticsearch/default"
        componentType="exporter"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/Exporter: elasticsearch\/default/)).toBeInTheDocument();
    expect(screen.getByText(/localhost:9200/)).toBeInTheDocument();
  });

  it('renders three tabs: Config, Health, Metrics', () => {
    render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('otelComponentDetailTab-config')).toBeInTheDocument();
    expect(screen.getByTestId('otelComponentDetailTab-health')).toBeInTheDocument();
    expect(screen.getByTestId('otelComponentDetailTab-metrics')).toBeInTheDocument();
  });

  it('shows Config tab content by default', () => {
    render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('otelComponentDetailTab-config')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText(/protocols:/)).toBeInTheDocument();
  });

  it('switches to Health tab and shows no data message when no health prop', () => {
    render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('otelComponentDetailTab-health'));
    expect(screen.getByTestId('otelComponentDetailHealthNoData')).toBeInTheDocument();
    expect(screen.queryByText(/protocols:/)).not.toBeInTheDocument();
  });

  it('shows health description list with status, reported status, and last updated', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'receiver:otlp': {
          healthy: true,
          status: 'StatusOK',
          status_time_unix_nano: 1_714_500_000_000_000_000,
        },
      },
    };

    render(
      <I18nProvider>
        <OTelComponentDetail
          componentId="otlp"
          componentType="receiver"
          config={config}
          health={health}
          onClose={jest.fn()}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('otelComponentDetailTab-health'));
    expect(screen.getByTestId('otelComponentDetailHealth')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('StatusOK')).toBeInTheDocument();
  });

  it('shows unhealthy status badge when component is unhealthy', () => {
    const health: ComponentHealth = {
      healthy: false,
      status: 'error',
      component_health_map: {
        'processor:batch': {
          healthy: false,
          status: 'StatusError',
          status_time_unix_nano: 1_714_500_000_000_000_000,
        },
      },
    };

    render(
      <I18nProvider>
        <OTelComponentDetail
          componentId="batch"
          componentType="processor"
          config={config}
          health={health}
          onClose={jest.fn()}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('otelComponentDetailTab-health'));
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
    expect(screen.getByText('StatusError')).toBeInTheDocument();
  });

  it('finds component health in nested health map', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        pipeline: {
          healthy: true,
          status: 'StatusOK',
          component_health_map: {
            'receiver:otlp': {
              healthy: true,
              status: 'Running',
              status_time_unix_nano: 1_714_500_000_000_000_000,
            },
          },
        },
      },
    };

    render(
      <I18nProvider>
        <OTelComponentDetail
          componentId="otlp"
          componentType="receiver"
          config={config}
          health={health}
          onClose={jest.fn()}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('otelComponentDetailTab-health'));
    expect(screen.getByTestId('otelComponentDetailHealth')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('switches to Metrics tab and shows placeholder', () => {
    render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('otelComponentDetailTab-metrics'));
    expect(screen.getByTestId('otelComponentDetailMetricsPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText(/protocols:/)).not.toBeInTheDocument();
  });
});
