/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/common';
import { createStubDataView, createStubDataViewLazy } from '@kbn/data-views-plugin/common/stubs';
import { defaultLogViewsStaticConfig } from './defaults';
import { ResolvedLogView, resolveLogView } from './resolved_log_view';
import { LogViewAttributes } from './types';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { createLogSourcesServiceMock } from '@kbn/logs-data-access-plugin/common/services/log_sources_service/log_sources_service.mocks';

export const createResolvedLogViewMock = (
  resolvedLogViewOverrides: Partial<ResolvedLogView<DataView>> = {}
): ResolvedLogView<DataView> => ({
  name: 'LOG VIEW',
  description: 'LOG VIEW DESCRIPTION',
  indices: 'log-indices-*',
  timestampField: 'TIMESTAMP_FIELD',
  tiebreakerField: 'TIEBREAKER_FIELD',
  messageField: ['MESSAGE_FIELD'],
  runtimeMappings: {
    runtime_field: {
      type: 'keyword',
      script: {
        source: 'emit("runtime value")',
      },
    },
  },
  columns: [
    { timestampColumn: { id: 'TIMESTAMP_COLUMN_ID' } },
    {
      fieldColumn: {
        id: 'DATASET_COLUMN_ID',
        field: 'event.dataset',
      },
    },
    {
      messageColumn: { id: 'MESSAGE_COLUMN_ID' },
    },
  ],
  dataViewReference: createStubDataView({
    spec: {
      id: 'log-view-data-view-mock',
      title: 'log-indices-*',
    },
  }),
  ...resolvedLogViewOverrides,
});

export const createResolvedLogViewLazyMock = (
  resolvedLogViewOverrides: Partial<ResolvedLogView> = {}
): ResolvedLogView => ({
  name: 'LOG VIEW',
  description: 'LOG VIEW DESCRIPTION',
  indices: 'log-indices-*',
  timestampField: 'TIMESTAMP_FIELD',
  tiebreakerField: 'TIEBREAKER_FIELD',
  messageField: ['MESSAGE_FIELD'],
  runtimeMappings: {
    runtime_field: {
      type: 'keyword',
      script: {
        source: 'emit("runtime value")',
      },
    },
  },
  columns: [
    { timestampColumn: { id: 'TIMESTAMP_COLUMN_ID' } },
    {
      fieldColumn: {
        id: 'DATASET_COLUMN_ID',
        field: 'event.dataset',
      },
    },
    {
      messageColumn: { id: 'MESSAGE_COLUMN_ID' },
    },
  ],
  dataViewReference: createStubDataViewLazy({
    spec: {
      id: 'log-view-data-view-mock',
      title: 'log-indices-*',
    },
  }),
  ...resolvedLogViewOverrides,
});

export const createResolvedLogViewMockFromAttributes = (logViewAttributes: LogViewAttributes) =>
  resolveLogView(
    'log-view-id',
    logViewAttributes,
    {
      get: async () => createStubDataViewLazy({ spec: {} }),
      getFieldsForWildcard: async () => [],
      create: async (spec: DataViewSpec) =>
        createStubDataViewLazy({
          spec,
        }),
    } as unknown as DataViewsContract,
    createLogSourcesServiceMock(),
    defaultLogViewsStaticConfig
  );
