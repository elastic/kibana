/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamResponse, IntegrationResponse } from './model/common_attributes.gen';

export type DataStreamEditState = 'loading' | 'editable' | 'error' | 'reanalyzing';

export const getDataStreamEditState = ({
  integration,
  dataStream,
  isLoading,
  isError,
}: {
  integration: IntegrationResponse | undefined;
  dataStream: DataStreamResponse;
  isLoading: boolean;
  isError: boolean;
}): DataStreamEditState => {
  if (isLoading) return 'loading';
  if (isError || !integration) return 'error';

  const currentDataStream =
    integration.dataStreams?.find(({ dataStreamId }) => dataStreamId === dataStream.dataStreamId) ??
    dataStream;
  if (currentDataStream.status === 'pending' || currentDataStream.status === 'processing') {
    return 'reanalyzing';
  }
  return 'editable';
};
