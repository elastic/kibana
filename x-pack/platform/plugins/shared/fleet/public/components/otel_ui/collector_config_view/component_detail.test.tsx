/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import type { OTelCollectorConfig } from '../../../../common/types';

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
});
