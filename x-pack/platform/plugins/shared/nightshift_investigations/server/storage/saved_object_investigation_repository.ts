/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';
import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from './errors';
import type {
  FindInvestigationsQuery,
  FindInvestigationsResult,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
  SeverityCounts,
} from './types';

const toRecord = <Attributes extends Partial<InvestigationAttributes>>({
  id,
  version,
  attributes,
}: SavedObject<Attributes>): Attributes & Pick<InvestigationRecord, 'id' | 'version'> => ({
  id,
  version,
  ...attributes,
});

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
    const attr = (field: string) => `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.${field}`;

    /**
     * Base filters: status, subject type, concurrency key, and date ranges.
     * Intentionally excludes the severity selection — the severity-count facet query uses only
     * these so the tile counts reflect search + date constraints but not the active severity tier.
     */
    const buildBaseFilters = (): string[] => {
      const filters: string[] = [];

      if (query.statuses?.length) {
        const statusFilter = query.statuses
          .map((status) => `${attr('status')}: "${escapeQuotes(status)}"`)
          .join(' OR ');
        filters.push(`(${statusFilter})`);
      }

      if (query.subjectTypes?.length) {
        const subjectTypeFilter = query.subjectTypes
          .map((type) => `${attr('subject_type')}: "${escapeQuotes(type)}"`)
          .join(' OR ');
        filters.push(`(${subjectTypeFilter})`);
      }

      if (query.concurrencyKey) {
        filters.push(`${attr('concurrency_key')}: "${escapeQuotes(query.concurrencyKey)}"`);
      }

      const rangeFilters: Array<[string, string | undefined, '>=' | '<=']> = [
        ['created_at', query.createdAfter, '>='],
        ['created_at', query.createdBefore, '<='],
        ['started_at', query.startedAfter, '>='],
        ['started_at', query.startedBefore, '<='],
        ['completed_at', query.completedAfter, '>='],
        ['completed_at', query.completedBefore, '<='],
      ];

      for (const [field, value, op] of rangeFilters) {
        if (value) {
          filters.push(`${attr(field)} ${op} "${escapeQuotes(value)}"`);
        }
      }

      return filters;
    };

    const buildSeverityFilter = (): string | undefined => {
      if (!query.severities?.length) return undefined;
      const severityFilter = query.severities
        .map((severity) => `${attr('severity')}: "${escapeQuotes(severity)}"`)
        .join(' OR ');
      return `(${severityFilter})`;
    };

    const baseFilters = buildBaseFilters();
    const severityFilter = buildSeverityFilter();
    const allFilters = severityFilter ? [...baseFilters, severityFilter] : baseFilters;
    const searchFields: string[] | undefined = query.query
      ? ['subject_summary', 'summary', 'conclusion']
      : undefined;

    type SeverityAgg = { severity: { buckets: Array<{ key: string; doc_count: number }> } };

    /**
     * Issue the list query and the severity-count facet query in parallel.
     * The facet query uses only baseFilters so tile counts remain accurate when a severity is
     * selected. `post_filter` is not available through the saved-objects `find()` API
     * (it is not in `SavedObjectsFindOptions`), so two separate queries is the correct approach.
     * `perPage: 0` on the facet call fetches zero hits at negligible extra cost.
     */
    const [result, facetResult] = await Promise.all([
      this.savedObjectsClient.find<Pick<InvestigationAttributes, Fields>>({
        type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        filter: allFilters.length > 0 ? allFilters.join(' AND ') : undefined,
        search: query.query,
        searchFields,
        sortField: query.sortField ?? 'created_at',
        sortOrder: query.sortOrder ?? 'desc',
        page: query.page,
        perPage: query.perPage,
        fields: query.fields,
      }),
      this.savedObjectsClient.find<Pick<InvestigationAttributes, never>, SeverityAgg>({
        type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        filter: baseFilters.length > 0 ? baseFilters.join(' AND ') : undefined,
        search: query.query,
        searchFields,
        perPage: 0,
        aggs: {
          severity: {
            terms: {
              field: `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.severity`,
              size: SEVERITY_OPTIONS.length,
            },
          },
        },
      }),
    ]);

    // Zero-filled per-tier counts — explicit key assignment so the type is earned, not cast.
    const bucketMap = new Map(
      (facetResult.aggregations?.severity?.buckets ?? []).map((b) => [b.key, b.doc_count])
    );
    const severityCounts: SeverityCounts = {
      '80-critical': bucketMap.get('80-critical') ?? 0,
      '60-high': bucketMap.get('60-high') ?? 0,
      '40-medium': bucketMap.get('40-medium') ?? 0,
      '20-low': bucketMap.get('20-low') ?? 0,
    };

    return {
      results: result.saved_objects.map(toRecord),
      total: result.total,
      page: result.page,
      size: result.per_page,
      severityCounts,
    };
  }
}
