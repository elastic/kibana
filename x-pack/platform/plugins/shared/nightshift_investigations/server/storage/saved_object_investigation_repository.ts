/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { buildInvestigationFilter } from './build_investigation_filter';
import { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from './errors';
import type {
  FindInvestigationsQuery,
  FindInvestigationsResult,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
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
    const result = await this.savedObjectsClient.find<Pick<InvestigationAttributes, Fields>>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: buildInvestigationFilter(query),
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
}
