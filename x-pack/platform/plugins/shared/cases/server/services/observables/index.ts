/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { SavedObject } from '@kbn/core/server';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { CASE_REF_NAME } from '../../common/constants';
import type { ObservablePersistedAttributes } from '../../common/types/observable';
import type { User } from '../../common/types/user';
import { ObservableGetter } from './operations/get';
import type { ObservableServiceContext, ObservableToCreate } from './types';
import { logged, throwOnErrors } from './utils';

export type {
  CaseWithFieldObservables,
  FindObservablesPageArgs,
  GetObservablesPreviewsOptions,
  ObservableKey,
  ObservableSortField,
  ObservablesPageItem,
  ObservablesPreview,
  ObservableToCreate,
} from './types';

/** Objects one bulk create request to Elasticsearch writes. */
const BULK_CREATE_CHUNK_SIZE = 1_000;

/**
 * Writes `cases-observables` objects, one per observable of a case; `getter` reads them. The
 * service does not authorize: callers authorize the case first.
 */
export class ObservableService {
  private readonly _getter: ObservableGetter;

  constructor(private readonly context: ObservableServiceContext) {
    this._getter = new ObservableGetter(context);
  }

  public get getter() {
    return this._getter;
  }

  /**
   * Creates observables under the ids the caller assigned. A 409 means an earlier attempt of the
   * same request already created that id, so the observable counts as created.
   */
  public async bulkCreate({
    caseId,
    owner,
    observables,
    user,
  }: {
    caseId: string;
    owner: string;
    observables: ObservableToCreate[];
    user: User;
  }): Promise<Observable[]> {
    return logged(
      this.context.log,
      `bulk create ${observables.length} observables on case ${caseId}`,
      async () => {
        const references = [{ type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: caseId }];
        const chunks = chunk(observables, BULK_CREATE_CHUNK_SIZE);

        for (const [chunkIndex, observablesChunk] of chunks.entries()) {
          const { saved_objects: results } =
            await this.context.unsecuredSavedObjectsClient.bulkCreate<ObservablePersistedAttributes>(
              observablesChunk.map(({ id, typeKey, value, description, createdAt }) => ({
                type: CASE_OBSERVABLE_SAVED_OBJECT,
                id,
                attributes: {
                  owner,
                  type_key: typeKey,
                  value,
                  description,
                  source_attachment_id: null,
                  created_at: createdAt,
                  created_by: user,
                  updated_at: null,
                  updated_by: null,
                },
                references,
              })),
              // Saved object indices have one shard, so the last chunk's refresh exposes every chunk.
              { refresh: chunkIndex === chunks.length - 1 ? 'wait_for' : false }
            );

          throwOnErrors('create', results, 409);
        }

        return observables.map(({ id, typeKey, value, description, createdAt }) => ({
          id,
          typeKey,
          value,
          description,
          createdAt,
          updatedAt: null,
        }));
      }
    );
  }

  /**
   * Updates an observable `getter.getForCase` returned, which checked it belongs to the case. Its
   * version makes a concurrent edit fail with a 409.
   */
  public async update({
    observable: { id, version },
    attributes,
  }: {
    observable: SavedObject<ObservablePersistedAttributes>;
    attributes: Partial<
      Pick<ObservablePersistedAttributes, 'value' | 'description' | 'updated_at' | 'updated_by'>
    >;
  }): Promise<void> {
    await logged(this.context.log, `update observable ${id}`, () =>
      this.context.unsecuredSavedObjectsClient.update<ObservablePersistedAttributes>(
        CASE_OBSERVABLE_SAVED_OBJECT,
        id,
        attributes,
        { version, refresh: 'wait_for' }
      )
    );
  }

  /**
   * Deletes observables `getter.getForCase` returned, which checked they belong to the case. Ones
   * that are already gone are not an error.
   */
  public async bulkDelete(
    observables: Array<SavedObject<ObservablePersistedAttributes>>
  ): Promise<void> {
    if (observables.length === 0) {
      return;
    }

    await logged(this.context.log, `delete ${observables.length} observables`, async () => {
      const { statuses } = await this.context.unsecuredSavedObjectsClient.bulkDelete(
        observables.map(({ id }) => ({ type: CASE_OBSERVABLE_SAVED_OBJECT, id })),
        { refresh: 'wait_for' }
      );

      throwOnErrors('delete', statuses, 404);
    });
  }
}
