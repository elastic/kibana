/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { Enricher, EnricherResponse } from '@kbn/index-management-shared-types';

export class IndexDataEnricher {
  private readonly _enrichers: Enricher[] = [];

  public add(enricher: Enricher) {
    this._enrichers.push(enricher);
  }

  public enrichIndices = (client: HttpSetup, signal: AbortSignal): Promise<EnricherResponse>[] => {
    return this.enrichers.map((enricher) =>
      enricher.fn(client, signal).catch((error) => {
        // aborted request, dont show error
        if (error.name === 'AbortError') {
          return {
            source: enricher.name,
          };
        }
        return {
          error: true,
          source: enricher.name,
        };
      })
    );
  };

  public get enrichers() {
    return this._enrichers;
  }
}

export const indexDataEnricher = new IndexDataEnricher();
