/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import {
  DataStreamMetadata,
  DataStreamReindexStatus,
  DataStreamReindexOperation,
} from '../../../../../../common/types';
import { ApiService } from '../../../../lib/api';

interface ReadOnlyExecuteResponse {
  data: {
    reindexOp: DataStreamReindexOperation;
  };
  error?: null;
}
const DEFAULT_BATCH_SIZE = 1;

export async function* readOnlyExecute(
  dataStreamName: string,
  meta: DataStreamMetadata | null,
  api: ApiService,
  batchSize: number = DEFAULT_BATCH_SIZE
): AsyncGenerator<ReadOnlyExecuteResponse, ReadOnlyExecuteResponse, unknown> {
  const { indicesRequiringUpgrade } = meta || {};

  const startTimeMs = +Date.now();

  if (!indicesRequiringUpgrade || !indicesRequiringUpgrade.length) {
    return {
      data: {
        reindexOp: {
          status: DataStreamReindexStatus.completed,
          reindexTaskPercComplete: 1,
          progressDetails: {
            startTimeMs,
            successCount: 0,
            pendingCount: 0,
            inProgressCount: 0,
            errorsCount: 0,
          },
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
          ? DataStreamReindexStatus.completed
          : DataStreamReindexStatus.inProgress;
      const reindexTaskPercComplete = processedCount / indicesRequiringUpgrade.length;

      yield {
        data: {
          reindexOp: {
            status,
            reindexTaskPercComplete,
            progressDetails: {
              startTimeMs,
              successCount: processedCount,
              pendingCount: indicesRequiringUpgrade.length - processedCount,
              inProgressCount: batch.length,
              errorsCount: 0,
            },
          },
        },
      };
    }
  } catch (error) {
    return {
      data: {
        reindexOp: {
          status: DataStreamReindexStatus.failed,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
    };
  }

  return {
    data: {
      reindexOp: {
        status: DataStreamReindexStatus.completed,
        reindexTaskPercComplete: 1,
        progressDetails: {
          startTimeMs,
          successCount: indicesRequiringUpgrade.length,
          pendingCount: 0,
          inProgressCount: 0,
          errorsCount: 0,
        },
      },
    },
  };
}

export const readOnlyCancel = async () => {
  return false;
};
