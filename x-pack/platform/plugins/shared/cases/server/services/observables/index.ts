/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Observable } from '../../../common/types/domain';
import { generateObservableDocumentId } from './observable_id';
import type {
  ObservableDocument,
  ObservableSource,
  ObservablesStorageClient,
} from './observables_index';

export { createObservablesStorage } from './observables_index';
export type {
  ObservableDocument,
  ObservableSource,
  ObservablesStorage,
  ObservablesStorageClient,
} from './observables_index';
export { generateObservableDocumentId } from './observable_id';

interface CaseScope {
  caseId: string;
  spaceId: string;
}

interface CreateObservablesArgs extends CaseScope {
  owner: string;
  observables: Observable[];
  source: ObservableSource;
}

interface DeleteObservablesArgs extends CaseScope {
  observables: Observable[];
}

interface UpdateObservableArgs extends CaseScope {
  owner: string;
  previous: Observable;
  next: Observable;
  source: ObservableSource;
}

const CONFLICT = 409;
const NOT_FOUND = 404;

const getStatusCode = (error: unknown): number | undefined =>
  (error as { meta?: { statusCode?: number }; statusCode?: number })?.meta?.statusCode ??
  (error as { statusCode?: number })?.statusCode;

/**
 * Mirrors the observables of a case into the observables index, one document per observable.
 *
 * While the case field is the source of truth, every method is a best-effort mirror that throws when
 * the index could not be fully written, so the caller can record the case as out of sync. An existing
 * document on create (409) and a missing document on delete (404) are not failures: the same observable
 * has the same deterministic id, so both mean the index already holds the intended state.
 */
export class ObservablesService {
  private readonly logger: Logger;
  private readonly storageClient: ObservablesStorageClient;

  constructor({
    storageClient,
    logger,
  }: {
    storageClient: ObservablesStorageClient;
    logger: Logger;
  }) {
    this.storageClient = storageClient;
    this.logger = logger;
  }

  public async createObservables({
    caseId,
    spaceId,
    owner,
    observables,
    source,
  }: CreateObservablesArgs): Promise<void> {
    if (observables.length === 0) {
      return;
    }

    await this.bulk({
      caseId,
      toleratedStatus: CONFLICT,
      operations: observables.map((observable) => ({
        create: {
          _id: generateObservableDocumentId({ spaceId, caseId, ...observable }),
          document: toDocument({ caseId, spaceId, owner, observable, source }),
        },
      })),
    });
  }

  public async deleteObservables({
    caseId,
    spaceId,
    observables,
  }: DeleteObservablesArgs): Promise<void> {
    if (observables.length === 0) {
      return;
    }

    await this.bulk({
      caseId,
      toleratedStatus: NOT_FOUND,
      operations: observables.map((observable) => ({
        delete: { _id: generateObservableDocumentId({ spaceId, caseId, ...observable }) },
      })),
    });
  }

  /**
   * A value change gets a new document id, so the new document is created and the old one deleted.
   * A description-only change rewrites the same document and keeps the source it was added with.
   */
  public async updateObservable({
    caseId,
    spaceId,
    owner,
    previous,
    next,
    source,
  }: UpdateObservableArgs): Promise<void> {
    const previousId = generateObservableDocumentId({ spaceId, caseId, ...previous });
    const nextId = generateObservableDocumentId({ spaceId, caseId, ...next });

    if (previousId !== nextId) {
      await this.bulk({
        caseId,
        toleratedStatus: CONFLICT,
        operations: [
          {
            create: {
              _id: nextId,
              document: toDocument({ caseId, spaceId, owner, observable: next, source }),
            },
          },
        ],
      });
      await this.deleteObservables({ caseId, spaceId, observables: [previous] });
      return;
    }

    const existingSource = await this.getSource(previousId);

    await this.bulk({
      caseId,
      operations: [
        {
          index: {
            _id: nextId,
            document: toDocument({
              caseId,
              spaceId,
              owner,
              observable: next,
              source: existingSource ?? source,
            }),
          },
        },
      ],
    });
  }

  private async getSource(id: string): Promise<ObservableSource | undefined> {
    try {
      const response = await this.storageClient.get({ id });
      return response._source?.source;
    } catch (error) {
      if (getStatusCode(error) === NOT_FOUND) {
        return undefined;
      }
      throw error;
    }
  }

  private async bulk({
    caseId,
    operations,
    toleratedStatus,
  }: {
    caseId: string;
    operations: Parameters<ObservablesStorageClient['bulk']>[0]['operations'];
    toleratedStatus?: number;
  }): Promise<void> {
    const response = await this.storageClient.bulk({ operations });

    if (!response.errors) {
      return;
    }

    const failures = response.items
      .map((item) => Object.values(item)[0])
      .filter(
        (result) =>
          result?.error !== undefined &&
          (toleratedStatus === undefined || result.status !== toleratedStatus)
      );

    if (failures.length === 0) {
      return;
    }

    this.logger.warn(
      `Failed to write ${failures.length} of ${operations.length} observables of case ${caseId} to the observables index`
    );
    throw new Error(
      `Failed to write ${failures.length} observables to the observables index: ${
        failures[0]?.error?.reason ?? 'unknown reason'
      }`
    );
  }
}

const toDocument = ({
  caseId,
  spaceId,
  owner,
  observable,
  source,
}: {
  caseId: string;
  spaceId: string;
  owner: string;
  observable: Observable;
  source: ObservableSource;
}): ObservableDocument => ({
  case_id: caseId,
  space_id: spaceId,
  owner,
  type_key: observable.typeKey,
  value: observable.value,
  ...(observable.description ? { description: observable.description } : {}),
  legacy_id: observable.id,
  source,
  created_at: observable.createdAt,
  updated_at: observable.updatedAt ?? observable.createdAt,
});
