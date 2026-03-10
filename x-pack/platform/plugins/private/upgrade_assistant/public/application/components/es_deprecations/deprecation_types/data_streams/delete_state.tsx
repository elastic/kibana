/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DataStreamMigrationStatus,
  DataStreamMigrationOperation,
} from '../../../../../../common/types';
import { ApiService } from '../../../../lib/api';

interface DeleteExecuteResponse {
  migrationOp: DataStreamMigrationOperation;
}

export async function* deleteExecute(
  dataStreamName: string,
  api: ApiService
): AsyncGenerator<DeleteExecuteResponse, DeleteExecuteResponse, DeleteExecuteResponse> {
  const startTimeMs = +Date.now();

  try {
    yield {
      migrationOp: {
        resolutionType: 'delete',
        status: DataStreamMigrationStatus.inProgress,
        taskPercComplete: 1,
        progressDetails: {
          startTimeMs,
          successCount: 0,
          pendingCount: 1,
          inProgressCount: 0,
          errorsCount: 0,
        },
      },
    };

    const { error } = await api.deleteDataStream(dataStreamName);

    if (error) {
      throw error;
    }
    return {
      migrationOp: {
        resolutionType: 'delete',
        status: DataStreamMigrationStatus.completed,
        taskPercComplete: 1,
        progressDetails: {
          startTimeMs,
          successCount: 1,
          pendingCount: 0,
          inProgressCount: 0,
          errorsCount: 0,
        },
      },
    };
  } catch (error) {
    return {
      migrationOp: {
        resolutionType: 'delete',
        status: DataStreamMigrationStatus.failed,
        errorMessage: error.message || 'Unknown error occurred',
      },
    };
  }
}
