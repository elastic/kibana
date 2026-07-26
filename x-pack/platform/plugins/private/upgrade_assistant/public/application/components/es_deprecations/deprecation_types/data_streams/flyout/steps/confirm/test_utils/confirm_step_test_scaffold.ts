/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataStreamMetadata,
  DataStreamMigrationWarning,
} from '../../../../../../../../../../common/types';

export const mockLoadNodeDiskSpace = jest.fn<
  {
    data: Array<{
      nodeName: string;
      availableBytes: number;
      lowDiskSpace: boolean;
      shards: string[];
    }>;
  },
  []
>();

export const mockMeta: DataStreamMetadata = {
  dataStreamName: 'my-data-stream',
  documentationUrl: 'https://example.invalid/meta-docs',
  lastIndexRequiringUpgradeCreationDate: 1700000000000,
  allIndices: ['.ds-my-data-stream-000001', '.ds-my-data-stream-000002'],
  allIndicesCount: 2,
  indicesRequiringUpgradeCount: 1,
  indicesRequiringUpgrade: ['.ds-my-data-stream-000001'],
  indicesRequiringUpgradeDocsCount: 10,
  indicesRequiringUpgradeDocsSize: 1024,
};

export const createWarnings = (
  resolutionType: 'readonly' | 'reindex'
): DataStreamMigrationWarning[] => [
  { warningType: 'incompatibleDataStream', meta: {}, resolutionType },
  { warningType: 'affectExistingSetups', meta: {}, resolutionType },
];
