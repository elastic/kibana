/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import {
  buildBaseInvestigationFilter,
  buildInvestigationFilter,
} from './build_investigation_filter';
import { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from './errors';
import type {
  FindInvestigationsQuery,
  FindInvestigationsResult,
  InvestigationDateFilters,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
  SeverityCounts,
  SeverityCountsQuery,
} from './types';
import type { ImpactEntity } from '../../common';

const toRecord = <Attributes extends Partial<InvestigationAttributes>>({
  id,
  version,
  attributes,
}: SavedObject<Attributes>): Attributes & Pick<InvestigationRecord, 'id' | 'version'> => ({
  id,
  version,
  ...attributes,
});

interface SeverityAggregation {
  severity: { buckets: Array<{ key: string; doc_count: number }> };
}

/** Text-mapped attributes the free-text `query` searches across. */
const buildSearchFields = (query: SeverityCountsQuery): string[] | undefined =>
  query.query ? ['subject_summary', 'summary', 'conclusion'] : undefined;

export type InvestigationSavedObjectsClient = Pick<
  SavedObjectsClientContract,
  'create' | 'get' | 'update' | 'find'
>;

export interface SavedObjectInvestigationRepositoryDeps {
  savedObjectsClient: InvestigationSavedObjectsClient;
}

export class SavedObjectInvestigationRepository implements InvestigationRepository {
  private readonly savedObjectsClient: InvestigationSavedObjectsClient;

  constructor({ savedObjectsClient }: SavedObjectInvestigationRepositoryDeps) {
    this.savedObjectsClient = savedObjectsClient;
  }

  async create({
    id,
    attributes,
  }: {
    id: string;
    attributes: InvestigationAttributes;
  }): Promise<void> {
    try {
      await this.savedObjectsClient.create<InvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        attributes,
        { id }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw new InvestigationAlreadyExistsError(id);
      }
      throw error;
    }
  }

  async get(id: string): Promise<InvestigationRecord | undefined> {
    try {
      const savedObject = await this.savedObjectsClient.get<InvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id
      );
      return toRecord(savedObject);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async update({
    id,
    patch,
    version,
  }: {
    id: string;
    patch: InvestigationPatch;
    version?: string;
  }): Promise<void> {
    try {
      await this.savedObjectsClient.update<InvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id,
        patch,
        { version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw new InvestigationStaleWriteError(id);
      }
      throw error;
    }
  }

  async find<Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes>(
    query: FindInvestigationsQuery<Fields>
  ): Promise<FindInvestigationsResult<Fields>> {
    const result = await this.savedObjectsClient.find<Pick<InvestigationAttributes, Fields>>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: buildInvestigationFilter(query),
      search: query.query,
      searchFields: buildSearchFields(query),
      sortField: query.sortField ?? 'created_at',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page,
      perPage: query.perPage,
      fields: query.fields,
    });

    return {
      results: result.saved_objects.map(toRecord),
      total: result.total,
      page: result.page,
      size: result.per_page,
    };
  }

  /**
   * Severity facet counts for the investigations matching `query`.
   *
   * Uses `buildBaseInvestigationFilter` rather than the full filter: the counts describe how many
   * investigations sit in each tier under the *other* active filters, so narrowing by the selected
   * tier would make them self-referential and zero out the tiles the user did not pick.
   *
   * Pagination and sort are irrelevant to a facet and are not read from `query` — which is why
   * this is its own method (and its own route) rather than riding along with the list, where it
   * would recompute an identical aggregation on every page change.
   */
  async countBySeverity(query: SeverityCountsQuery): Promise<SeverityCounts> {
    const result = await this.savedObjectsClient.find<
      Pick<InvestigationAttributes, never>,
      SeverityAggregation
    >({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: buildBaseInvestigationFilter(query),
      search: query.query,
      searchFields: buildSearchFields(query),
      perPage: 0,
      aggs: {
        severity: {
          terms: {
            field: `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.severity`,
            size: SEVERITY_OPTIONS.length,
          },
        },
      },
    });

    const buckets = new Map(
      (result.aggregations?.severity?.buckets ?? []).map((b) => [b.key, b.doc_count])
    );

    // Explicit per-tier assignment so the type is earned rather than asserted.
    return {
      '80-critical': buckets.get('80-critical') ?? 0,
      '60-high': buckets.get('60-high') ?? 0,
      '40-medium': buckets.get('40-medium') ?? 0,
      '20-low': buckets.get('20-low') ?? 0,
    };
  }

  async findImpactEntities(query: InvestigationDateFilters): Promise<ImpactEntity[]> {
    const result = await this.savedObjectsClient.find<Pick<InvestigationAttributes, 'impact'>>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: buildBaseInvestigationFilter(query),
      perPage: 1000,
      fields: ['impact'],
    });
    const entities = new Map<string, ImpactEntity>();

    for (const { attributes } of result.saved_objects) {
      for (const { name, type } of attributes.impact?.entities ?? []) {
        entities.set(JSON.stringify([name, type]), type === undefined ? { name } : { name, type });
      }
    }

    return [...entities.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        (a.type === undefined ? -1 : b.type === undefined ? 1 : a.type.localeCompare(b.type))
    );
  }
}
