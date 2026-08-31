/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from './errors';
import type {
  FindInvestigationsQuery,
  FindInvestigationsResult,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
} from './types';

const toRecord = (savedObject: SavedObject<InvestigationAttributes>): InvestigationRecord => ({
  id: savedObject.id,
  version: savedObject.version,
  ...savedObject.attributes,
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

  async update(
    id: string,
    patch: InvestigationPatch,
    options: { version?: string } = {}
  ): Promise<void> {
    try {
      await this.savedObjectsClient.update(NIGHTSHIFT_INVESTIGATION_SO_TYPE, id, patch, {
        version: options.version,
      });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw new InvestigationStaleWriteError(id);
      }
      throw error;
    }
  }

  async find(query: FindInvestigationsQuery): Promise<FindInvestigationsResult> {
    const filters: string[] = [];
    const attr = (field: string) => `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.${field}`;

    if (query.statuses?.length) {
      const statusFilter = query.statuses
        .map((status) => `${attr('status')}: "${escapeQuotes(status)}"`)
        .join(' OR ');
      filters.push(`(${statusFilter})`);
    }

    if (query.concurrencyKey) {
      filters.push(`${attr('concurrency_key')}: "${escapeQuotes(query.concurrencyKey)}"`);
    }

    const rangeFilters: Array<[string, string | undefined, '>=' | '<=']> = [
      ['created_at', query.createdAfter, '>='],
      ['created_at', query.createdBefore, '<='],
      ['completed_at', query.completedAfter, '>='],
      ['completed_at', query.completedBefore, '<='],
    ];

    for (const [field, value, op] of rangeFilters) {
      if (value) {
        filters.push(`${attr(field)} ${op} "${escapeQuotes(value)}"`);
      }
    }

    const result = await this.savedObjectsClient.find<InvestigationAttributes>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sortField: query.sortField ?? 'created_at',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page,
      perPage: query.perPage,
      ...(query.fields?.length ? { fields: query.fields } : {}),
    });

    return {
      results: result.saved_objects.map(toRecord),
      total: result.total,
      page: result.page,
      size: result.per_page,
    };
  }
}
