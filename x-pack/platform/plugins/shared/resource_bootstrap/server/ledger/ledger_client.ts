/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { LEDGER_SAVED_OBJECT_TYPE, type LedgerEntry } from '../../common';

const NOT_FOUND = 404;
const PAGE_SIZE = 1000;

/** A ledger entry with the id of the document that holds it. */
export interface LedgerItem {
  docId: string;
  entry: LedgerEntry;
}

type LedgerEntryAttributes = Omit<LedgerEntry, 'id'> & { resourceId: string };

const toAttributes = ({ id, ...rest }: LedgerEntry): LedgerEntryAttributes => ({
  ...rest,
  resourceId: id,
});

const toEntry = ({ resourceId, ...rest }: LedgerEntryAttributes): LedgerEntry => ({
  ...rest,
  id: resourceId,
});

const throwOnFailures = (action: string, failures: Array<{ message: string }>): void => {
  if (failures.length > 0) {
    throw new Error(
      `Could not ${action} ${failures.length} ledger entries: ${failures[0].message}`
    );
  }
};

/**
 * Stores one document per entry. Writes wait for a refresh, so the next run, which may start as soon
 * as the apply lock is released, sees them; only the apply lock holder writes.
 */
export class LedgerClient {
  constructor(private readonly repository: ISavedObjectsRepository) {}

  async list(): Promise<LedgerItem[]> {
    const finder = this.repository.createPointInTimeFinder<LedgerEntryAttributes>({
      type: LEDGER_SAVED_OBJECT_TYPE,
      perPage: PAGE_SIZE,
    });
    const items: LedgerItem[] = [];
    try {
      for await (const { saved_objects: page } of finder.find()) {
        items.push(
          ...page.map(({ id, attributes }) => ({ docId: id, entry: toEntry(attributes) }))
        );
      }
    } finally {
      await finder.close();
    }
    return items;
  }

  /** Creates or replaces the items. */
  async put(items: LedgerItem[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const { saved_objects: results } = await this.repository.bulkCreate<LedgerEntryAttributes>(
      items.map(({ docId, entry }) => ({
        type: LEDGER_SAVED_OBJECT_TYPE,
        id: docId,
        attributes: toAttributes(entry),
      })),
      { overwrite: true, refresh: 'wait_for' }
    );
    throwOnFailures(
      'record',
      results.flatMap((result) => (isSavedObjectErrorResult(result) ? [result.error] : []))
    );
  }

  /** Deletes the documents; ones already gone count as deleted. */
  async remove(docIds: string[]): Promise<void> {
    if (docIds.length === 0) {
      return;
    }
    const { statuses } = await this.repository.bulkDelete(
      docIds.map((id) => ({ type: LEDGER_SAVED_OBJECT_TYPE, id })),
      { refresh: 'wait_for' }
    );
    throwOnFailures(
      'delete',
      statuses.flatMap(({ success, error }) =>
        success || error?.statusCode === NOT_FOUND
          ? []
          : [{ message: error?.message ?? 'Unknown error' }]
      )
    );
  }
}
