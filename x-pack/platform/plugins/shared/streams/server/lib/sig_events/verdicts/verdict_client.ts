/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql, type ComposerQuery, type ComposerSortShorthand } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { z } from '@kbn/zod/v4';
import type { verdictEnum } from '@kbn/streams-schema';
import {
  type CommonSearchOptions,
  type TimestampSort,
  applyFilter,
  applyTimeWindow,
  collapseToLatest,
  parseSort,
} from '../query_utils';
import { baseSpaceScopedQuery, executeSourceQuery } from '../latest_source_query';
import {
  VERDICTS_DATA_STREAM,
  type StoredVerdict,
  type Verdict,
  type verdictsMappings,
} from './data_stream';

export type VerdictDataStreamClient = IDataStreamClient<typeof verdictsMappings, StoredVerdict>;

export type VerdictSort = TimestampSort;

export type VerdictValue = z.infer<typeof verdictEnum>;

export interface VerdictsSearchOptions extends CommonSearchOptions {
  verdict?: VerdictValue[];
  discovery_id?: string[];
  /**
   * Soft ranking boost on `discovery_slug` — matching verdicts are returned
   * ahead of others, non-matching rows are still returned (used by the KB
   * fetch where slug scoping is advisory).
   */
  prioritize_slug?: string[];
  size?: number;
  sort?: VerdictSort[];
}

const SLUG_PRIORITY_COLUMN = '_slug_priority';

export class VerdictClient {
  constructor(
    private readonly clients: {
      dataStreamClient: VerdictDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(verdicts: Verdict[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: verdicts,
    });
  }

  async findLatest(options: VerdictsSearchOptions = {}): Promise<{ hits: Verdict[] }> {
    let query = baseSpaceScopedQuery(VERDICTS_DATA_STREAM, this.clients.space);
    query = applyTimeWindow(query, options);

    query = applyFilter({ query, options, key: 'verdict' });
    query = applyFilter({ query, options, key: 'discovery_id' });

    query = this.applySlugPriorityEval(query, options);
    query = collapseToLatest(query, 'verdict_id');
    query = this.applySort(query, options);
    query = query.keep('_source');

    if (options.size !== undefined) {
      query = query.limit(options.size);
    }

    return executeSourceQuery<Verdict>(this.clients.esClient, query);
  }

  async findLatestPerSlug(options: VerdictsSearchOptions = {}): Promise<{ hits: Verdict[] }> {
    let query = baseSpaceScopedQuery(VERDICTS_DATA_STREAM, this.clients.space);

    query = applyTimeWindow(query, options);

    query = this.applySlugPriorityEval(query, options);

    query = collapseToLatest(query, 'discovery_slug');

    query = applyFilter({ query, options, key: 'verdict' });
    query = applyFilter({ query, options, key: 'discovery_id' });

    query = this.applySort(query, options);
    query = query.keep('_source');
    if (options.size !== undefined) {
      query = query.limit(options.size);
    }

    return executeSourceQuery<Verdict>(this.clients.esClient, query);
  }

  async getReviewedSummary(
    options: CommonSearchOptions = {}
  ): Promise<{ reviewed_discovery_ids: string[]; reviewed_slugs: string[] }> {
    let query = esql.from([VERDICTS_DATA_STREAM])
      .where`\`kibana.space_ids\` == ${this.clients.space}`;

    query = applyTimeWindow(query, options);

    query = query.pipe`STATS reviewed_discovery_ids = VALUES(${esql.col(
      'discovery_id'
    )}), reviewed_slugs = VALUES(${esql.col('discovery_slug')})`;

    const response = (await this.clients.esClient.esql.query({
      query: query.print(),
    })) as ESQLSearchResponse;

    const idsIdx = response.columns.findIndex((c) => c.name === 'reviewed_discovery_ids');
    const slugsIdx = response.columns.findIndex((c) => c.name === 'reviewed_slugs');

    if (response.values.length === 0 || idsIdx === -1 || slugsIdx === -1) {
      return { reviewed_discovery_ids: [], reviewed_slugs: [] };
    }

    const row = response.values[0];
    return {
      reviewed_discovery_ids: toStringArray(row[idsIdx]),
      reviewed_slugs: toStringArray(row[slugsIdx]),
    };
  }

  private applySlugPriorityEval(
    query: ComposerQuery,
    options: VerdictsSearchOptions
  ): ComposerQuery {
    if (!options.prioritize_slug?.length) {
      return query;
    }
    const literals = options.prioritize_slug.map((slug) => esql.str(slug));
    return query.pipe`EVAL ${esql.col(SLUG_PRIORITY_COLUMN)} = CASE(${esql.col(
      'discovery_slug'
    )} IN (${literals}), 0, 1)`;
  }

  private applySort(query: ComposerQuery, options: VerdictsSearchOptions): ComposerQuery {
    const userSort = options.sort?.map(parseSort) ?? [];
    const sortKeys: ComposerSortShorthand[] = options.prioritize_slug?.length
      ? [[SLUG_PRIORITY_COLUMN, 'ASC'], ...userSort]
      : userSort;
    if (!sortKeys.length) {
      return query;
    }
    return query.sort(sortKeys[0], ...sortKeys.slice(1));
  }
}

const toStringArray = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
};
