/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export async function* readOnlyExecute(
  dataStreamName: string,
  meta: DataStreamMetadata | null,
  api: ApiService
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

  let i = 0;
  for (const index of indicesRequiringUpgrade) {
    // const { data, error } = await api.markIndicesAsReadOnly(dataStreamName, [index]);
    i++;
    const status =
      i >= indicesRequiringUpgrade.length
        ? DataStreamReindexStatus.completed
        : DataStreamReindexStatus.inProgress;
    const reindexTaskPercComplete = i / indicesRequiringUpgrade.length;

    yield {
      data: {
        reindexOp: {
          status,
          reindexTaskPercComplete,
          progressDetails: {
            startTimeMs,
            successCount: i,
            pendingCount: indicesRequiringUpgrade.length - i,
            inProgressCount: 1,
            errorsCount: 0,
          },
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
