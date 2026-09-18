/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { buildInvestigationFilter } from './build_investigation_filter';
import { InvestigationStaleWriteError } from './errors';
import type {
  FindInvestigationsAcrossSpacesResult,
  FindInvestigationsQuery,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationSweepRepository,
} from './types';

export interface SavedObjectInvestigationSweepRepositoryDeps {
  /** Unscoped, so a single search covers every space. */
  savedObjects: ISavedObjectsRepository;
}

export class SavedObjectInvestigationSweepRepository implements InvestigationSweepRepository {
  private readonly savedObjects: ISavedObjectsRepository;

  constructor({ savedObjects }: SavedObjectInvestigationSweepRepositoryDeps) {
    this.savedObjects = savedObjects;
  }

  async findAcrossSpaces<
    Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
  >(query: FindInvestigationsQuery<Fields>): Promise<FindInvestigationsAcrossSpacesResult<Fields>> {
    const result = await this.savedObjects.find<Pick<InvestigationAttributes, Fields>>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      namespaces: ['*'],
      filter: buildInvestigationFilter(query),
      sortField: query.sortField ?? 'created_at',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page,
      perPage: query.perPage,
      fields: query.fields,
    });

    return {
      results: result.saved_objects.map((savedObject) => ({
        investigation: {
          id: savedObject.id,
          version: savedObject.version,
          ...savedObject.attributes,
        },
        spaceId: SavedObjectsUtils.namespaceIdToString(savedObject.namespaces?.[0]),
      })),
      total: result.total,
      page: result.page,
      size: result.per_page,
    };
  }

  async updateInSpace({
    id,
    spaceId,
    patch,
    version,
  }: {
    id: string;
    spaceId: string;
    patch: InvestigationPatch;
    version?: string;
  }): Promise<void> {
    try {
      await this.savedObjects.update<InvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id,
        patch,
        { namespace: spaceId, version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw new InvestigationStaleWriteError(id);
      }
      throw error;
    }
  }
}

/** Builds a repository that reaches every space, for use outside a request. */
export const createInvestigationSweepRepository = (
  savedObjects: SavedObjectsServiceStart
): InvestigationSweepRepository =>
  new SavedObjectInvestigationSweepRepository({
    savedObjects: savedObjects.createInternalRepository([NIGHTSHIFT_INVESTIGATION_SO_TYPE]),
  });
