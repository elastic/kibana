/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { Enricher } from '@kbn/index-management-shared-types';
import type { Index } from '..';

export class IndexDataEnricher {
  private readonly _enrichers: Enricher[] = [];

  public add(enricher: Enricher) {
    this._enrichers.push(enricher);
  }

  public enrichIndices = (client: HttpSetup): Promise<Index[]>[] => {
    return this.enrichers.map((enricher) => enricher(client));
  };

  public get enrichers() {
    return this._enrichers;
  }
}

export const indexDataEnricher = new IndexDataEnricher();
