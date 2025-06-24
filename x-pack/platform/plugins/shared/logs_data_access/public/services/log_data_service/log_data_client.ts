/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchGeneric } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';
import { LogSourcesService } from '../../../common/types';
import { ILogDataClient } from './types';

export class LogDataClient implements ILogDataClient {
  constructor(
    private readonly logSourcesService: LogSourcesService,
    private readonly search: ISearchGeneric
  ) {}

  public async getStatus() {
    const logSourcesIndex = await this.logSourcesService.getFlattenedLogSources();
    const status = await lastValueFrom(
      this.search({
        params: {
          ignore_unavailable: true,
          allow_no_indices: true,
          index: logSourcesIndex,
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
}

const hasTotalHits = (totalHits: number | { value: number } | undefined) =>
  typeof totalHits === 'number' ? totalHits > 0 : Number(totalHits?.value) > 0;
