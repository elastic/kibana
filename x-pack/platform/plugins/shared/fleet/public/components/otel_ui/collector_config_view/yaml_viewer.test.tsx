/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { dump } from 'js-yaml';

import type { OTelCollectorConfig } from '../../../../common/types';

import { YamlViewer } from './yaml_viewer';

const config: OTelCollectorConfig = {
  receivers: {
    otlp: {
      protocols: {
        grpc: { endpoint: '0.0.0.0:4317' },
        http: { endpoint: '0.0.0.0:4318' },
      },
    },
  },
  processors: {
    batch: { timeout: '1s', send_batch_size: 1024 },
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

describe('YamlViewer', () => {
  it('renders the code block with YAML content', () => {
    render(<YamlViewer config={config} />);

    expect(screen.getByTestId('otelYamlViewer')).toBeInTheDocument();
    expect(screen.getByTestId('otelYamlViewerCodeBlock')).toBeVisible();
  });

  it('shows the title "Effective configuration (YAML)"', () => {
    render(<YamlViewer config={config} />);

    expect(screen.getByText('Effective configuration (YAML)')).toBeInTheDocument();
  });

  it('shows the correct line count in the badge', () => {
    render(<YamlViewer config={config} />);

    const yamlContent = dump(config, { lineWidth: -1, quotingType: '"' });
    const lineCount = yamlContent.split('\n').filter(Boolean).length;

    expect(screen.getByText(`${lineCount} lines`)).toBeInTheDocument();
  });

  it('renders YAML content with all top-level sections', () => {
    render(<YamlViewer config={config} />);

    expect(screen.getByText(/receivers:/)).toBeInTheDocument();
    expect(screen.getByText(/processors:/)).toBeInTheDocument();
    expect(screen.getByText(/exporters:/)).toBeInTheDocument();
    expect(screen.getByText(/service:/)).toBeInTheDocument();
  });

  it('renders a download button', () => {
    render(<YamlViewer config={config} />);

    expect(screen.getByTestId('otelYamlViewerDownload')).toBeInTheDocument();
  });

  it('handles an empty config without crashing', () => {
    render(<YamlViewer config={{}} />);
    expect(screen.getByTestId('otelYamlViewer')).toBeInTheDocument();
  });
});
