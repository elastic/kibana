/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { LogSourcesService } from '../../../common/types';
import type { RegisterServicesParams } from '../register_services';
import type { LogDataService } from './types';

export function createLogDataService(
  params: RegisterServicesParams & { logSourcesService: LogSourcesService }
): LogDataService {
  const { logSourcesService, deps } = params;

  async function getStatus(opts?: { excludeIndices?: string[] }) {
    const excludeLogSourcesIndex = (opts?.excludeIndices ?? [])
      .map((index) => `-${index}`)
      .join(',');
    const logSourcesIndex = await logSourcesService.getFlattenedLogSources();
    const status = await lastValueFrom(
      deps.search.search({
        params: {
          ignore_unavailable: true,
          allow_no_indices: true,
          index: [logSourcesIndex, excludeLogSourcesIndex].join(','),
          size: 0,
          terminate_after: 1,
          track_total_hits: 1,
        },
      })
    ).then(
      ({ rawResponse }) => {
        if (rawResponse._shards.total <= 0) {
          return 'missing' as const;
        }

        const totalHits = rawResponse.hits.total;
        if (hasTotalHits(totalHits)) {
          return 'available' as const;
        }

        return 'empty' as const;
      },
      (err) => {
        if (err.status === 404) {
          return 'missing' as const;
        }
        throw new Error(`Failed to check status of log indices of "${logSourcesIndex}": ${err}`);
      }
    );

    return {
      status,
      hasData: status === 'available',
    };
  }

  return {
    getStatus,
  };
}

const hasTotalHits = (totalHits: number | { value: number } | undefined) =>
  typeof totalHits === 'number' ? totalHits > 0 : Number(totalHits?.value) > 0;
