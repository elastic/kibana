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
  RULE_DOCTOR_FINDINGS_INDEX,
  type RuleDoctorFindingDoc,
  type RuleDoctorFindingStatus,
} from '../../resources/indices/rule_doctor_findings';
import type {
  ListFindingsParams,
  ListFindingsResult,
  CountFindingsParams,
  BulkIndexFindingsResult,
} from './types';

const DEFAULT_PAGE_SIZE = 20;

@injectable()
export class RuleDoctorFindingsClient {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async listFindings(params: ListFindingsParams): Promise<ListFindingsResult> {
    const { from = 0, size = DEFAULT_PAGE_SIZE } = params;

    const response = await this.esClient.search<RuleDoctorFindingDoc>({
      index: RULE_DOCTOR_FINDINGS_INDEX,
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

    const items = response.hits.hits.map((hit) => hit._source as RuleDoctorFindingDoc);

    return { items, total };
  }

  public async getFinding(findingId: string, spaceId: string): Promise<RuleDoctorFindingDoc> {
    const response = await this.esClient.search<RuleDoctorFindingDoc>({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { finding_id: findingId } },
            { term: { space_id: spaceId } },
          ],
        },
      },
      size: 1,
    });

    const hit = response.hits.hits[0];
    if (!hit?._source) {
      throw Boom.notFound(`Finding ${findingId} not found`);
    }

    return hit._source;
  }

  public async updateFindingStatus(
    findingId: string,
    status: RuleDoctorFindingStatus,
    spaceId: string
  ): Promise<void> {
    const response = await this.esClient.search({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { finding_id: findingId } },
            { term: { space_id: spaceId } },
          ],
        },
      },
      size: 1,
      _source: false,
    });

    const hit = response.hits.hits[0];
    if (!hit?._id) {
      throw Boom.notFound(`Finding ${findingId} not found`);
    }

    await this.esClient.update({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      id: hit._id,
      doc: { status },
      refresh: 'wait_for',
    });
  }

  public async bulkIndexFindings(
    findings: RuleDoctorFindingDoc[]
  ): Promise<BulkIndexFindingsResult> {
    if (findings.length === 0) {
      return { indexed: 0, failed: 0 };
    }

    const operations = findings.flatMap((finding) => [
      { index: { _index: RULE_DOCTOR_FINDINGS_INDEX, _id: finding.finding_id } },
      finding,
    ]);

    const response = await this.esClient.bulk({ operations, refresh: false });

    const failed = response.items.filter((item) => item.index?.error).length;
    const indexed = findings.length - failed;

    if (response.errors) {
      const firstError = response.items.find((item) => item.index?.error)?.index?.error;
      this.logger.error({
        error: new Error(
          `[${firstError?.type ?? 'UNKNOWN'}] ${firstError?.reason ?? 'unknown reason'}`
        ),
        code: 'BULK_INDEX_FINDINGS_ERROR',
        type: 'RuleDoctorFindingsClient',
      });
    }

    this.logger.debug({
      message: `RuleDoctorFindingsClient: bulk indexed ${indexed} findings (${failed} failed)`,
    });

    return { indexed, failed };
  }

  public async countFindings(params: CountFindingsParams): Promise<number> {
    const response = await this.esClient.count({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      ignore_unavailable: true,
      query: this.buildFilterQuery(params),
    });

    return response.count;
  }

  private buildFilterQuery(
    params: ListFindingsParams | CountFindingsParams
  ): QueryDslQueryContainer {
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
