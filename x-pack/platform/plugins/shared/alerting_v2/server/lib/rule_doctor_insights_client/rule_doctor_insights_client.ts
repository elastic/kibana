/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { LoggerServiceToken } from '../services/logger_service/logger_service';
import {
  RULE_DOCTOR_INSIGHTS_INDEX,
  type RuleDoctorInsightDoc,
  type RuleDoctorInsightStatus,
} from '../../resources/indices/rule_doctor_insights';
import type { ListInsightsParams, ListInsightsResult, BulkIndexInsightsResult } from './types';

const DEFAULT_PAGE_SIZE = 20;

@injectable()
export class RuleDoctorInsightsClient {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async listInsights(params: ListInsightsParams): Promise<ListInsightsResult> {
    const { from = 0, size = DEFAULT_PAGE_SIZE } = params;

    const response = await this.esClient.search<RuleDoctorInsightDoc>({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      ignore_unavailable: true,
      query: this.buildFilterQuery(params),
      sort: [{ '@timestamp': { order: 'desc' } }],
      from,
      size,
      track_total_hits: true,
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const items = response.hits.hits.map((hit) => hit._source as RuleDoctorInsightDoc);

    return { items, total };
  }

  public async getInsight(insightId: string, spaceId: string): Promise<RuleDoctorInsightDoc> {
    const response = await this.esClient.search<RuleDoctorInsightDoc>({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [{ term: { insight_id: insightId } }, { term: { space_id: spaceId } }],
        },
      },
      size: 1,
    });

    const hit = response.hits.hits[0];
    if (!hit?._source) {
      throw Boom.notFound(`Insight ${insightId} not found`);
    }

    return hit._source;
  }

  public async updateInsightStatus(
    insightId: string,
    status: RuleDoctorInsightStatus,
    spaceId: string
  ): Promise<void> {
    const response = await this.esClient.search({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [{ term: { insight_id: insightId } }, { term: { space_id: spaceId } }],
        },
      },
      size: 1,
      _source: false,
    });

    const hit = response.hits.hits[0];
    if (!hit?._id) {
      throw Boom.notFound(`Insight ${insightId} not found`);
    }

    await this.esClient.update({
      index: RULE_DOCTOR_INSIGHTS_INDEX,
      id: hit._id,
      doc: { status },
      refresh: 'wait_for',
    });
  }

  public async bulkIndexInsights(
    insights: RuleDoctorInsightDoc[]
  ): Promise<BulkIndexInsightsResult> {
    if (insights.length === 0) {
      return { indexed: 0, failed: 0 };
    }

    const operations = insights.flatMap((insight) => [
      {
        index: {
          _index: RULE_DOCTOR_INSIGHTS_INDEX,
          _id: `${insight.space_id}:${insight.insight_id}`,
        },
      },
      insight,
    ]);

    const response = await this.esClient.bulk({ operations, refresh: false });

    const failed = response.items.filter((item) => item.index?.error).length;
    const indexed = insights.length - failed;

    if (response.errors) {
      const firstError = response.items.find((item) => item.index?.error)?.index?.error;
      this.logger.error({
        error: new Error(
          `[${firstError?.type ?? 'UNKNOWN'}] ${firstError?.reason ?? 'unknown reason'}`
        ),
        code: 'BULK_INDEX_INSIGHTS_ERROR',
        type: 'RuleDoctorInsightsClient',
      });
    }

    this.logger.debug({
      message: `RuleDoctorInsightsClient: bulk indexed ${indexed} insights (${failed} failed)`,
    });

    return { indexed, failed };
  }

  private buildFilterQuery(params: ListInsightsParams): QueryDslQueryContainer {
    const filters: QueryDslQueryContainer[] = [{ term: { space_id: params.spaceId } }];

    if (params.status) {
      filters.push({ term: { status: params.status } });
    }
    if (params.type) {
      filters.push({ term: { type: params.type } });
    }
    if ('executionId' in params && params.executionId) {
      filters.push({ term: { execution_id: params.executionId } });
    }
    if ('ruleIds' in params && params.ruleIds?.length) {
      filters.push({ terms: { rule_ids: params.ruleIds } });
    }

    return { bool: { filter: filters } };
  }
}
