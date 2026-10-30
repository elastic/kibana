/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationResponse } from './model/common_attributes.gen';
import { getDataStreamEditState } from './data_stream_edit_state';

describe('getDataStreamEditState', () => {
  const dataStream = {
    dataStreamId: 'ds1',
    title: 'Test',
    description: 'desc',
    inputTypes: [],
    status: 'completed' as const,
  };
  const integration: IntegrationResponse = {
    integrationId: 'int-1',
    title: 'Test',
    description: 'desc',
    status: 'completed',
    dataStreams: [dataStream],
  };

  it('does not fail open while integration state is unavailable', () => {
    expect(
      getDataStreamEditState({ integration, dataStream, isLoading: true, isError: false })
    ).toBe('loading');
    expect(
      getDataStreamEditState({
        integration: undefined,
        dataStream,
        isLoading: false,
        isError: true,
      })
    ).toBe('error');
  });

  it('is read-only while the data stream is reanalyzing', () => {
    expect(
      getDataStreamEditState({
        integration: {
          ...integration,
          dataStreams: [{ ...dataStream, status: 'processing' }],
        },
        dataStream,
        isLoading: false,
        isError: false,
      })
    ).toBe('reanalyzing');
  });

  it('stays editable after approval', () => {
    expect(
      getDataStreamEditState({
        integration: {
          ...integration,
          status: 'approved',
        },
        dataStream,
        isLoading: false,
        isError: false,
      })
    ).toBe('editable');
  });
});
