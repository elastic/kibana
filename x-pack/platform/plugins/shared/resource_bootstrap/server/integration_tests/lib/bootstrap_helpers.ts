/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSavedObjectErrorResult } from '@kbn/core/server';
import { request, type TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import pRetry from 'p-retry';
import {
  LEDGER_SAVED_OBJECT_TYPE,
  STATUS_API_PATH,
  type BootstrapStatusResponse,
  type LedgerEntry,
} from '../../../common';
import { LedgerClient } from '../../ledger/ledger_client';

export const DATA_VIEW_TYPE = 'index-pattern';

/** Kibana answers 503 until its own status is available, so that is not a failure yet. */
export const getStatus = async ({
  root,
}: Pick<TestKibanaUtils, 'root'>): Promise<BootstrapStatusResponse | undefined> => {
  const response = await request
    .get(root, STATUS_API_PATH)
    .set('x-elastic-internal-origin', 'kibana');
  return response.status === 200 ? response.body : undefined;
};

/**
 * The record of an earlier run is served until this one records its own hash, so a run only
 * counts once the hash differs from `previousHash`. A restart on unchanged files keeps the hash,
 * so `previousFinishedAt` also holds out for a record written after that time. `accept` picks
 * which outcomes end the wait.
 */
export const waitForFinished = async (
  kibanaServer: Pick<TestKibanaUtils, 'root'>,
  {
    previousHash = null,
    previousFinishedAt,
    accept = ['completed', 'failed'],
  }: {
    previousHash?: string | null;
    previousFinishedAt?: string;
    accept?: Array<'completed' | 'failed'>;
  } = {}
): Promise<BootstrapStatusResponse> => {
  const accepted: string[] = accept;
  return pRetry(
    async () => {
      const status = await getStatus(kibanaServer);
      if (
        status === undefined ||
        status.status === 'none' ||
        status.hash === previousHash ||
        !status.finishedAt ||
        status.finishedAt === previousFinishedAt ||
        !accepted.includes(status.status)
      ) {
        throw new Error(`The bootstrap did not finish: ${JSON.stringify(status)}`);
      }
      return status;
    },
    { retries: 119, factor: 1, minTimeout: 1000, maxTimeout: 1000 }
  );
};

/** What the ledger owns, sorted by id, without what was last written. */
export const readLedger = async ({
  coreStart,
}: Pick<TestKibanaUtils, 'coreStart'>): Promise<
  Array<Pick<LedgerEntry, 'kind' | 'id' | 'spaces'>>
> => {
  const ledger = new LedgerClient(
    coreStart.savedObjects.createInternalRepository([LEDGER_SAVED_OBJECT_TYPE])
  );
  return (await ledger.list())
    .map(({ entry: { kind, id, spaces } }) => ({ kind, id, spaces }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

/** The spaces the data view `id` is in, wherever it is. */
export const dataViewSpaces = async (
  { coreStart }: Pick<TestKibanaUtils, 'coreStart'>,
  id: string
): Promise<string[]> => {
  const {
    saved_objects: [found],
  } = await coreStart.savedObjects
    .createInternalRepository()
    .bulkGet([{ type: DATA_VIEW_TYPE, id, namespaces: ['*'] }]);
  return isSavedObjectErrorResult(found) ? [] : [...(found.namespaces ?? [])].sort();
};

/** The ids of `type` that exist in `namespace`, sorted. */
export const existing = async (
  { coreStart }: Pick<TestKibanaUtils, 'coreStart'>,
  type: string,
  ids: string[],
  namespace?: string
): Promise<string[]> => {
  const { saved_objects: found } = await coreStart.savedObjects.createInternalRepository().bulkGet(
    ids.map((id) => ({ type, id })),
    { namespace }
  );
  return found
    .filter((object) => !isSavedObjectErrorResult(object))
    .map(({ id }) => id)
    .sort();
};

/** A `data_view` file with one data view per id, titled `<id>-*`, naming `spaces` when given. */
export const dataViewsJson = (ids: string[], spaces?: string[]): string =>
  JSON.stringify(ids.map((id) => ({ id, title: `${id}-*`, ...(spaces && { spaces }) })));
