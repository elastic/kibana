/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { DataQualityColumn } from './data_quality_column';

jest.mock('@kbn/dataset-quality-plugin/public', () => ({ DatasetQualityIndicator: () => null }));
jest.mock('../../hooks/use_streams_app_router', () => ({ useStreamsAppRouter: jest.fn() }));

const link = jest.fn(() => '/link');

describe('DataQualityColumn', () => {
  beforeEach(() => {
    link.mockClear();
    jest
      .mocked(useStreamsAppRouter)
      .mockReturnValue({ link } as unknown as ReturnType<typeof useStreamsAppRouter>);
  });

  it('links to the data quality tab with the origin of the list', () => {
    render(
      <DataQualityColumn streamName="logs.otel" quality="good" isLoading={false} origin="v2" />
    );

    expect(link).toHaveBeenCalledWith('/{key}/management/{tab}', {
      path: { key: 'logs.otel', tab: 'dataQuality' },
      query: { origin: 'v2' },
    });
  });

  it('links without an origin from the V1 list', () => {
    render(<DataQualityColumn streamName="logs.otel" quality="good" isLoading={false} />);

    expect(link).toHaveBeenCalledWith('/{key}/management/{tab}', {
      path: { key: 'logs.otel', tab: 'dataQuality' },
      query: {},
    });
  });
});
