/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';

/**
 * A pre-query filter provider is a callback registered by an external plugin
 * (e.g. Security Solution) that returns a DSL filter to be composed into the
 * ES|QL query's `filter` parameter *before* the query executes.
 *
 * This lets solution plugins inject filtering logic (e.g. exception lists)
 * without the Alerting v2 platform plugin depending on solution-specific
 * packages.
 */
export type PreQueryFilterProvider = (context: {
  rule: RuleResponse;
  request: KibanaRequest;
}) => Promise<QueryDslQueryContainer | null>;

export class PreQueryFilterRegistry {
  private readonly providers: Array<{ name: string; provider: PreQueryFilterProvider }> = [];
  private frozen = false;

  public register(name: string, provider: PreQueryFilterProvider): void {
    if (this.frozen) {
      throw new Error(
        `Cannot register pre-query filter provider "${name}" after the plugin has started.`
      );
    }
    this.providers.push({ name, provider });
  }

  public freeze(): void {
    this.frozen = true;
  }

  public getProviders(): ReadonlyArray<{ name: string; provider: PreQueryFilterProvider }> {
    return this.providers;
  }
}

export const PreQueryFilterRegistryToken = Symbol.for(
  'alerting_v2.PreQueryFilterRegistry'
) as ServiceIdentifier<PreQueryFilterRegistry>;
