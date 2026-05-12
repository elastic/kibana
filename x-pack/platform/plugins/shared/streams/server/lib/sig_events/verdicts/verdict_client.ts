/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql, type ComposerSortShorthand } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { type CommonSearchOptions, andWhere, inList, parseSort } from '../query_utils';
import {
  type LatestSourceEvalColumn,
  type LatestSourceWhereCondition,
  runLatestSourceEsqlQuery,
} from '../latest_source_query';
import {
  VERDICTS_DATA_STREAM,
  type StoredVerdict,
  type Verdict,
  type verdictsMappings,
} from './data_stream';

export type VerdictDataStreamClient = IDataStreamClient<typeof verdictsMappings, StoredVerdict>;

export type VerdictSort = '@timestamp:asc' | '@timestamp:desc';

export interface VerdictsSearchOptions extends CommonSearchOptions {
  verdict?: string[];
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

const buildWhere = (options: VerdictsSearchOptions): LatestSourceWhereCondition | undefined => {
  let where: LatestSourceWhereCondition | undefined;

  if (options.verdict?.length) {
    where = andWhere(where, inList('verdict', options.verdict));
  }

  return where;
};

/**
 * Build the EVAL column + matching primary sort entry for `prioritize_slug`.
 * Returns `undefined` for both when the list is empty so the caller can leave
 * its sort pipeline unchanged.
 */
const buildSlugPriority = (
  options: VerdictsSearchOptions
): { evalColumn: LatestSourceEvalColumn; sort: ComposerSortShorthand } | undefined => {
  if (!options.prioritize_slug?.length) {
    return undefined;
  }
  const literals = options.prioritize_slug.map((slug) => esql.str(slug));
  return {
    evalColumn: {
      name: SLUG_PRIORITY_COLUMN,
      expression: esql.exp`CASE(${esql.col('discovery_slug')} IN (${literals}), 0, 1)`,
    },
    sort: [SLUG_PRIORITY_COLUMN, 'ASC'],
  };
};

const buildSort = (
  options: VerdictsSearchOptions,
  priority: ReturnType<typeof buildSlugPriority>
): ComposerSortShorthand[] | undefined => {
  const userSort = options.sort?.map(parseSort) ?? [];
  if (!priority) {
    return userSort.length ? userSort : undefined;
  }
  return [priority.sort, ...userSort];
};

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
    return this.runFindLatest(options, 'verdict_id');
  }

  async findLatestPerSlug(options: VerdictsSearchOptions = {}): Promise<{ hits: Verdict[] }> {
    return this.runFindLatest(options, 'discovery_slug');
  }

  private async runFindLatest(
    options: VerdictsSearchOptions,
    groupBy: 'verdict_id' | 'discovery_slug'
  ): Promise<{ hits: Verdict[] }> {
    const priority = buildSlugPriority(options);
    return runLatestSourceEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: VERDICTS_DATA_STREAM,
      where: buildWhere(options),
      evalColumns: priority ? [priority.evalColumn] : undefined,
      sort: buildSort(options, priority),
      limit: options.size,
      groupBy,
    });
  }

  async getReviewedSummary(
    options: CommonSearchOptions = {}
  ): Promise<{ reviewed_discovery_ids: string[]; reviewed_slugs: string[] }> {
    let query = esql.from([VERDICTS_DATA_STREAM])
      .where`\`kibana.space_ids\` == ${this.clients.space}`;

    if (options.from !== undefined) {
      query = query.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
    }

    if (options.to !== undefined) {
      query = query.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
    }

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
