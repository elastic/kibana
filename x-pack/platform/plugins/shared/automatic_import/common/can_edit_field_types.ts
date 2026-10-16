/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamResponse, IntegrationResponse } from './model/common_attributes.gen';

export type FieldTypeEditState = 'loading' | 'editable' | 'locked' | 'error' | 'reanalyzing';

export const canEditDataStreamFieldTypes = ({
  dataStreamId,
  lastApprovedDataStreamIds,
}: {
  dataStreamId: string;
  lastApprovedDataStreamIds?: string[];
}): boolean => {
  if (!lastApprovedDataStreamIds || lastApprovedDataStreamIds.length === 0) {
    return true;
  }
  return !lastApprovedDataStreamIds.includes(dataStreamId);
};

export const getLastApprovedDataStreamIds = (
  integration: IntegrationResponse | undefined
): string[] | undefined => {
  if (!integration) {
    return undefined;
  }
  const value = integration.lastApprovedDataStreamIds;
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
};

export const getFieldTypeEditState = ({
  integration,
  dataStream,
  isLoading,
  isError,
}: {
  integration: IntegrationResponse | undefined;
  dataStream: DataStreamResponse;
  isLoading: boolean;
  isError: boolean;
}): FieldTypeEditState => {
  if (isLoading) return 'loading';
  if (isError || !integration) return 'error';

  const currentDataStream =
    integration.dataStreams?.find(({ dataStreamId }) => dataStreamId === dataStream.dataStreamId) ??
    dataStream;
  if (currentDataStream.status === 'pending' || currentDataStream.status === 'processing') {
    return 'reanalyzing';
  }

  return canEditDataStreamFieldTypes({
    dataStreamId: dataStream.dataStreamId,
    lastApprovedDataStreamIds: getLastApprovedDataStreamIds(integration),
  })
    ? 'editable'
    : 'locked';
};
