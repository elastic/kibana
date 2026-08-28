/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';
import type { InvestigationStatus, PaginatedResponse } from '../../common';
import {
  NIGHTSHIFT_INVESTIGATION_SO_TYPE,
  type NightshiftInvestigationAttributes,
} from './investigation_saved_object';

export interface InvestigationStructuredOutput {
  summary?: string;
  conclusion?: string;
  hypotheses?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  blind_spots?: Array<Record<string, unknown>>;
  significant_event_updates?: Array<Record<string, unknown>>;
  impact?: { entities: Array<Record<string, unknown>> };
}

export interface InvestigationSavedObjectUpdateAttributes extends InvestigationStructuredOutput {
  status?: InvestigationStatus;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
}

export interface FindInvestigationsOptions {
  statuses?: InvestigationStatus[];
  createdAfter?: string;
  createdBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  sortField?: 'created_at' | 'completed_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  fields?: string[];
}

export type FindInvestigationsResult = PaginatedResponse<
  SavedObject<NightshiftInvestigationAttributes>
>;

export interface InvestigationSavedObjectClientDeps {
  savedObjectsClient: SavedObjectsClientContract;
}

export class InvestigationSavedObjectClient {
  private readonly savedObjectsClient: SavedObjectsClientContract;

  constructor({ savedObjectsClient }: InvestigationSavedObjectClientDeps) {
    this.savedObjectsClient = savedObjectsClient;
  }

  async create({
    id,
    attributes,
  }: {
    id: string;
    attributes: NightshiftInvestigationAttributes;
  }): Promise<void> {
    await this.savedObjectsClient.create<NightshiftInvestigationAttributes>(
      NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      attributes,
      { id }
    );
  }

  async get(id: string): Promise<NightshiftInvestigationAttributes | undefined> {
    try {
      const so = await this.savedObjectsClient.get<NightshiftInvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id
      );
      return so.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async update(id: string, attributes: InvestigationSavedObjectUpdateAttributes): Promise<void> {
    await this.savedObjectsClient.update(NIGHTSHIFT_INVESTIGATION_SO_TYPE, id, attributes);
  }

  async findByConcurrencyKey(
    concurrencyKey: string
  ): Promise<SavedObject<NightshiftInvestigationAttributes> | undefined> {
    const result = await this.savedObjectsClient.find<NightshiftInvestigationAttributes>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.concurrency_key: "${escapeQuotes(
        concurrencyKey
      )}"`,
      perPage: 1,
      sortField: 'created_at',
      sortOrder: 'desc',
    });

    return result.saved_objects[0];
  }

  async find(options: FindInvestigationsOptions): Promise<FindInvestigationsResult> {
    const filters: string[] = [];
    const attr = (field: string) => `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.${field}`;

    if (options.statuses?.length) {
      const statusFilter = options.statuses
        .map((s) => `${attr('status')}: "${escapeQuotes(s)}"`)
        .join(' OR ');
      filters.push(`(${statusFilter})`);
    }

    const rangeFilters: Array<[string, string | undefined, '>=' | '<=']> = [
      ['created_at', options.createdAfter, '>='],
      ['created_at', options.createdBefore, '<='],
      ['completed_at', options.completedAfter, '>='],
      ['completed_at', options.completedBefore, '<='],
    ];

    for (const [field, value, op] of rangeFilters) {
      if (value) {
        filters.push(`${attr(field)} ${op} "${escapeQuotes(value)}"`);
      }
    }

    const result = await this.savedObjectsClient.find<NightshiftInvestigationAttributes>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sortField: options.sortField ?? 'created_at',
      sortOrder: options.sortOrder ?? 'desc',
      page: options.page,
      perPage: options.perPage,
      ...(options.fields?.length ? { fields: options.fields } : {}),
    });

    return {
      results: result.saved_objects,
      total: result.total,
      page: result.page,
      size: result.per_page,
    };
  }
}
