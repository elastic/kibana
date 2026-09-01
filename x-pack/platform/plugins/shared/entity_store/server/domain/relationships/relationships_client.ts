/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import {
  RELATIONSHIP_OBSERVED_ACTION,
  type RelationshipKind,
  type RelationshipMetadataDoc,
} from '../../../common/domain/entity_metadata/relationship_metadata';
import { ENTITY_METADATA, getEntitiesAlias } from '../../../common/domain/entity_index';
import { runWithSpan } from '../../telemetry/traces';
import { searchRelationshipMetadata } from '../../infra/elasticsearch/relationships';

interface ListRelationshipMetadataParams {
  entityId: string;
  kind?: RelationshipKind;
  target?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
  sortField?: '@timestamp' | 'event.ingested';
  sortOrder?: SortOrder;
}

interface EarliestObservationByTargetParams {
  entityId: string;
  kind: RelationshipKind;
  targets: string[];
}

interface EarliestObservationByTargetAggs {
  by_target: {
    buckets: Array<{
      key: string;
      earliest?: { value?: number | null };
    }>;
  };
}

interface ListRelationshipMetadataResult {
  records: RelationshipMetadataDoc[];
  total: number;
  page: number;
  perPage: number;
}

interface RelationshipsClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

/**
 * Read-side domain client for relationship records in the entity metadata
 * datastream. Reads filter by `event.action: relationship_observed`.
 * Writes go through the `EntityMetadataClient`.
 */
export class RelationshipsClient {
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;

  constructor(deps: RelationshipsClientDependencies) {
    this.esClient = deps.esClient;
    this.namespace = deps.namespace;
    this.initWithTracing();
  }

  private initWithTracing(): void {
    const { namespace } = this;

    const baseListRelationshipMetadata = this.listRelationshipMetadata.bind(this);
    const tracedListRelationshipMetadata = (
      params: ListRelationshipMetadataParams
    ): Promise<ListRelationshipMetadataResult> =>
      runWithSpan({
        name: 'entityStore.relationships.list_metadata',
        namespace,
        attributes: {
          'entity_store.relationships.operation': 'list_metadata',
        },
        cb: () => baseListRelationshipMetadata(params),
      });

    Object.defineProperty(this, 'listRelationshipMetadata', {
      value: tracedListRelationshipMetadata,
      configurable: true,
      writable: true,
    });

    const baseGetEarliestObservationByTarget = this.getEarliestObservationByTarget.bind(this);
    const tracedGetEarliestObservationByTarget = (
      params: EarliestObservationByTargetParams
    ): Promise<Map<string, number>> =>
      runWithSpan({
        name: 'entityStore.relationships.earliest_observation_by_target',
        namespace,
        attributes: {
          'entity_store.relationships.operation': 'earliest_observation_by_target',
        },
        cb: () => baseGetEarliestObservationByTarget(params),
      });

    Object.defineProperty(this, 'getEarliestObservationByTarget', {
      value: tracedGetEarliestObservationByTarget,
      configurable: true,
      writable: true,
    });
  }

  public async listRelationshipMetadata(
    params: ListRelationshipMetadataParams
  ): Promise<ListRelationshipMetadataResult> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const sortField = params.sortField ?? '@timestamp';
    const sortOrder: SortOrder = params.sortOrder ?? 'desc';

    const resp = await searchRelationshipMetadata(this.esClient, {
      index: getEntitiesAlias(ENTITY_METADATA, this.namespace),
      entityId: params.entityId,
      kind: params.kind,
      target: params.target,
      from: params.from,
      to: params.to,
      sortField,
      sortOrder,
      pageOffset: (page - 1) * perPage,
      pageSize: perPage,
    });

    const records = resp.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is RelationshipMetadataDoc => src !== undefined);
    const total =
      typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total?.value ?? 0;

    return { records, total, page, perPage };
  }

  public async getEarliestObservationByTarget(
    params: EarliestObservationByTargetParams
  ): Promise<Map<string, number>> {
    const { entityId, kind, targets } = params;
    const result = new Map<string, number>();
    if (targets.length === 0) return result;

    const targetField = `entity.relationships.${kind}.target`;
    const resp = await this.esClient.search<unknown, EarliestObservationByTargetAggs>({
      index: getEntitiesAlias(ENTITY_METADATA, this.namespace),
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { 'event.action': RELATIONSHIP_OBSERVED_ACTION } },
            { term: { 'entity.id': entityId } },
            { terms: { [targetField]: targets } },
          ],
        },
      },
      aggs: {
        by_target: {
          terms: { field: targetField, include: targets, size: targets.length },
          aggs: { earliest: { min: { field: '@timestamp' } } },
        },
      },
    });

    const buckets = resp.aggregations?.by_target.buckets ?? [];
    for (const bucket of buckets) {
      const earliestMs = bucket.earliest?.value;
      if (typeof earliestMs === 'number') result.set(bucket.key, earliestMs);
    }

    return result;
  }
}
