/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';
import type { TestRenderer } from '../../../../../../../../mock';
import type {
  ExperimentalDataStreamFeature,
  RegistryDataStream,
} from '../../../../../../../../../common/types';

import { ColumnarIndexModeToggle } from './columnar_index_mode_toggle';

const SWITCH_TEST_SUBJ = 'packagePolicyEditor.columnarIndexMode.switch';

const mockRegistryDataStream: RegistryDataStream = {
  title: 'Access logs',
  release: 'ga',
  type: 'logs',
  package: 'nginx',
  dataset: 'nginx.access',
  path: 'access',
  elasticsearch: {},
  ingest_pipeline: 'default',
  streams: [],
};

describe('ColumnarIndexModeToggle', () => {
  let testRenderer: TestRenderer;
  let onChange: jest.Mock;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    onChange = jest.fn();
  });

  const render = (
    registryDataStream: RegistryDataStream = mockRegistryDataStream,
    experimentalDataStreamFeatures?: ExperimentalDataStreamFeature[]
  ) =>
    testRenderer.render(
      <ColumnarIndexModeToggle
        registryDataStream={registryDataStream}
        experimentalDataStreamFeatures={experimentalDataStreamFeatures}
        onChange={onChange}
      />
    );

  it('renders unchecked and enabled by default', () => {
    const result = render();
    const toggle = result.getByTestId(SWITCH_TEST_SUBJ);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).not.toBeDisabled();
    expect(result.getByText('Columnar index mode')).toBeInTheDocument();
    expect(result.getByText('Technical preview')).toBeInTheDocument();
  });

  it('adds a new feature entry for the data stream when enabled', () => {
    const result = render();
    fireEvent.click(result.getByTestId(SWITCH_TEST_SUBJ));
    expect(onChange).toHaveBeenCalledWith([
      { data_stream: 'logs-nginx.access', features: { columnar: true } },
    ]);
  });

  it('preserves other data streams and features when toggling', () => {
    const existing: ExperimentalDataStreamFeature[] = [
      { data_stream: 'metrics-nginx.stubstatus', features: { tsdb: true } },
      { data_stream: 'logs-nginx.access', features: { synthetic_source: true, columnar: true } },
    ];
    const result = render(mockRegistryDataStream, existing);
    const toggle = result.getByTestId(SWITCH_TEST_SUBJ);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith([
      { data_stream: 'metrics-nginx.stubstatus', features: { tsdb: true } },
      { data_stream: 'logs-nginx.access', features: { synthetic_source: true, columnar: false } },
    ]);
    // Input must not be mutated
    expect(existing[1].features.columnar).toBe(true);
  });

  it('is disabled when TSDB is opted in for the same data stream', () => {
    const result = render(mockRegistryDataStream, [
      { data_stream: 'logs-nginx.access', features: { tsdb: true } },
    ]);
    expect(result.getByTestId(SWITCH_TEST_SUBJ)).toBeDisabled();
    expect(
      result.getByTestId('packagePolicyEditor.columnarIndexMode.disabledTooltip')
    ).toBeInTheDocument();
  });

  it('is disabled when the package declares index_mode: time_series', () => {
    const result = render({
      ...mockRegistryDataStream,
      type: 'metrics',
      dataset: 'nginx.stubstatus',
      elasticsearch: { index_mode: 'time_series' },
    });
    expect(result.getByTestId(SWITCH_TEST_SUBJ)).toBeDisabled();
  });

  it('is checked and disabled when the package declares a columnar index_mode', () => {
    const result = render({
      ...mockRegistryDataStream,
      elasticsearch: { index_mode: 'logsdb_columnar' },
    });
    const toggle = result.getByTestId(SWITCH_TEST_SUBJ);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toBeDisabled();
  });
});
