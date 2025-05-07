/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import {
  DataStreamMetadata,
  DataStreamMigrationStatus,
  DataStreamMigrationOperation,
} from '../../../../../../common/types';
import { ApiService } from '../../../../lib/api';

interface ReadOnlyExecuteResponse {
  migrationOp: DataStreamMigrationOperation;
}

const DEFAULT_BATCH_SIZE = 10;

export async function* readOnlyExecute(
  dataStreamName: string,
  meta: DataStreamMetadata | null,
  api: ApiService,
  batchSize: number = DEFAULT_BATCH_SIZE
): AsyncGenerator<ReadOnlyExecuteResponse, ReadOnlyExecuteResponse, ReadOnlyExecuteResponse> {
  const { indicesRequiringUpgrade } = meta || {};

  const startTimeMs = +Date.now();

  if (!indicesRequiringUpgrade || !indicesRequiringUpgrade.length) {
    return {
      migrationOp: {
        status: DataStreamMigrationStatus.completed,
        resolutionType: 'readonly',
        taskPercComplete: 1,
        progressDetails: {
          startTimeMs,
          successCount: 0,
          pendingCount: 0,
          inProgressCount: 0,
          errorsCount: 0,
        },
      },
    };
  }

  let processedCount = 0;
  const batches = chunk(indicesRequiringUpgrade, batchSize);

  try {
    for (const batch of batches) {
      const { error } = await api.markIndicesAsReadOnly(dataStreamName, batch);
      if (error) {
        throw error;
      }

      processedCount += batch.length;

      const status =
        processedCount >= indicesRequiringUpgrade.length
          ? DataStreamMigrationStatus.completed
          : DataStreamMigrationStatus.inProgress;
      const taskPercComplete = processedCount / indicesRequiringUpgrade.length;

      yield {
        migrationOp: {
          resolutionType: 'readonly',
          status,
          taskPercComplete,
          progressDetails: {
            startTimeMs,
            successCount: processedCount,
            pendingCount: indicesRequiringUpgrade.length - processedCount,
            inProgressCount: batch.length,
            errorsCount: 0,
          },
        },
      };
    }
  } catch (error) {
    return {
      migrationOp: {
        resolutionType: 'readonly',
        status: DataStreamMigrationStatus.failed,
        errorMessage: error.message || 'Unknown error occurred',
      },
    };
  }

  return {
    migrationOp: {
      resolutionType: 'readonly',
      status: DataStreamMigrationStatus.completed,
      taskPercComplete: 1,
      progressDetails: {
        startTimeMs,
        successCount: indicesRequiringUpgrade.length,
        pendingCount: 0,
        inProgressCount: 0,
        errorsCount: 0,
      },
    },
  };
}
