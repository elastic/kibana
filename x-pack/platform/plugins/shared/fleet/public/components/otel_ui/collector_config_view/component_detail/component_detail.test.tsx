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
  let testRenderer: TestRenderer;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  it('renders the component title with type label and ID', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.getByText(/Receiver: otlp/)).toBeInTheDocument();
  });

  it('renders the component configuration as YAML on Config tab', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(result.getByTestId('otelComponentDetailTab-config'));
    expect(result.getByText(/protocols:/)).toBeInTheDocument();
    expect(result.getByText(/grpc:/)).toBeInTheDocument();
    expect(result.getByText(/0.0.0.0:4317/)).toBeInTheDocument();
  });

  it('renders "No additional configuration" when component has no config', () => {
    const minimalConfig: OTelCollectorConfig = {
      receivers: { noop: null },
      service: { pipelines: {} },
    };

    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="noop"
        componentType="receiver"
        config={minimalConfig}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(result.getByTestId('otelComponentDetailTab-config'));
    expect(result.getByText('No additional configuration')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();

    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="batch"
        componentType="processor"
        config={config}
        onClose={onClose}
      />
    );

    fireEvent.click(result.getByTestId('otelComponentDetailCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders exporter configuration correctly', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="elasticsearch/default"
        componentType="exporter"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.getByText(/Exporter: elasticsearch\/default/)).toBeInTheDocument();
    fireEvent.click(result.getByTestId('otelComponentDetailTab-config'));
    expect(result.getByText(/localhost:9200/)).toBeInTheDocument();
  });

  it('renders three tabs: Health, Metrics, Config', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.getByTestId('otelComponentDetailTab-health')).toBeInTheDocument();
    expect(result.getByTestId('otelComponentDetailTab-config')).toBeInTheDocument();
    expect(result.getByTestId('otelComponentDetailTab-metrics')).toBeInTheDocument();
  });

  it('shows Health tab by default', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.getByTestId('otelComponentDetailTab-health')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows no data message on Health tab when no health prop', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.getByTestId('otelComponentDetailHealthNoData')).toBeInTheDocument();
  });

  it('shows health description list with status and reported status', () => {
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

    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        health={health}
        onClose={jest.fn()}
      />
    );

    const healthPanel = result.getByTestId('otelComponentDetailHealth');
    expect(healthPanel).toBeInTheDocument();
    expect(healthPanel.textContent).toContain('Healthy');
    expect(healthPanel.textContent).toContain('StatusOK');
  });

  it('shows unhealthy status badge when component is unhealthy', () => {
    const health: ComponentHealth = {
      healthy: false,
      status: 'error',
      component_health_map: {
        'processor:batch': {
          healthy: false,
          status: 'StatusPermanentError',
          status_time_unix_nano: 1_714_500_000_000_000_000,
        },
      },
    };

    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="batch"
        componentType="processor"
        config={config}
        health={health}
        onClose={jest.fn()}
      />
    );

    const healthPanel = result.getByTestId('otelComponentDetailHealth');
    expect(healthPanel.textContent).toContain('Unhealthy');
    expect(healthPanel.textContent).toContain('StatusPermanentError');
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
              status: 'StatusOK',
              status_time_unix_nano: 1_714_500_000_000_000_000,
            },
          },
        },
      },
    };

    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        health={health}
        onClose={jest.fn()}
      />
    );

    const healthPanel = result.getByTestId('otelComponentDetailHealth');
    expect(healthPanel).toBeInTheDocument();
    expect(healthPanel.textContent).toContain('Healthy');
  });

  it('renders pipeline detail with pipeline YAML', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="logs/default"
        componentType="pipeline"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.getByText(/Pipeline: logs\/default/)).toBeInTheDocument();
    fireEvent.click(result.getByTestId('otelComponentDetailTab-config'));
    expect(result.getByText(/receivers:/)).toBeInTheDocument();
    expect(result.getByText(/processors:/)).toBeInTheDocument();
    expect(result.getByText(/exporters:/)).toBeInTheDocument();
  });

  it('does not render Metrics tab for pipeline', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="logs/default"
        componentType="pipeline"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.queryByTestId('otelComponentDetailTab-metrics')).not.toBeInTheDocument();
  });

  it('renders a documentation link for a known component', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="otlp"
        componentType="receiver"
        config={config}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(result.getByTestId('otelComponentDetailTab-config'));
    const docLink = result.getByTestId('otelComponentDocLink');
    expect(docLink).toBeInTheDocument();
    expect(docLink.getAttribute('href')).toBe(
      'https://opentelemetry.io/docs/collector/components/receiver/'
    );
  });

  it('does not render a documentation link for pipeline type', () => {
    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="logs/default"
        componentType="pipeline"
        config={config}
        onClose={jest.fn()}
      />
    );

    expect(result.queryByTestId('otelComponentDocLink')).not.toBeInTheDocument();
  });

  it('renders a documentation link for any component of a supported type', () => {
    const unknownConfig: OTelCollectorConfig = {
      receivers: { unknown_nonexistent: { endpoint: 'localhost:1234' } },
      service: { pipelines: {} },
    };

    const result = testRenderer.render(
      <OTelComponentDetail
        componentId="unknown_nonexistent"
        componentType="receiver"
        config={unknownConfig}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(result.getByTestId('otelComponentDetailTab-config'));
    const docLink = result.getByTestId('otelComponentDocLink');
    expect(docLink).toBeInTheDocument();
    expect(docLink.getAttribute('href')).toBe(
      'https://opentelemetry.io/docs/collector/components/receiver/'
    );
  });
});
