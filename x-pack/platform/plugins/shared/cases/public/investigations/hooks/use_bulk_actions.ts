/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type {
  CloseRecordRequest,
  InvestigationRecord,
  UpdateRecordRequest,
} from '../../../common/investigations/types';
import { closeRecord, updateRecord } from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { getHttpErrorMessage } from './errors';

/** How many records are written at the same time. */
const BULK_CONCURRENCY = 4;

export type BulkRecordOutcome = 'done' | 'unchanged' | 'blocked';

/** What happened to one selected investigation. */
export interface BulkRecordResult {
  recordId: string;
  displayId: string;
  title: string;
  outcome: BulkRecordOutcome;
  /** The server's plain message when the record was blocked. */
  message?: string;
}

export interface BulkRunState {
  phase: 'idle' | 'running' | 'done';
  total: number;
  completed: number;
  results: BulkRecordResult[];
}

const IDLE: BulkRunState = { phase: 'idle', total: 0, completed: 0, results: [] };

type BulkPerform = (record: InvestigationRecord) => Promise<BulkRecordOutcome>;

/**
 * Runs one write per selected investigation, a few at a time, and keeps a result for each: done,
 * unchanged, or blocked with the message the server refused with. One failure never stops the rest.
 */
export const useBulkRecordRun = () => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const [state, setState] = useState<BulkRunState>(IDLE);

  const run = useCallback(
    async (records: InvestigationRecord[], perform: BulkPerform): Promise<BulkRecordResult[]> => {
      const results: BulkRecordResult[] = new Array(records.length);
      let next = 0;
      let completed = 0;
      setState({ phase: 'running', total: records.length, completed: 0, results: [] });

      const worker = async () => {
        while (next < records.length) {
          const index = next++;
          const record = records[index];
          const base = { recordId: record.id, displayId: record.display_id, title: record.title };
          try {
            results[index] = { ...base, outcome: await perform(record) };
          } catch (error) {
            results[index] = { ...base, outcome: 'blocked', message: getHttpErrorMessage(error) };
          }
          completed += 1;
          setState((previous) => ({ ...previous, completed }));
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(BULK_CONCURRENCY, records.length) }, () => worker())
      );
      await Promise.all([
        queryClient.invalidateQueries(investigationKeys.findAll()),
        ...records.map((record) =>
          queryClient.invalidateQueries(investigationKeys.recordScope(record.id))
        ),
      ]);
      setState({ phase: 'done', total: records.length, completed: records.length, results });
      return results;
    },
    [queryClient]
  );

  /** `buildBody` returns null for a record that already has the wanted value. */
  const runUpdate = useCallback(
    (
      records: InvestigationRecord[],
      buildBody: (record: InvestigationRecord) => UpdateRecordRequest | null
    ) =>
      run(records, async (record) => {
        const body = buildBody(record);
        if (body === null) {
          return 'unchanged';
        }
        await updateRecord(http, record.id, body);
        return 'done';
      }),
    [http, run]
  );

  const runClose = useCallback(
    (records: InvestigationRecord[], body: CloseRecordRequest) =>
      run(records, async (record) => {
        if (record.status === 'closed') {
          return 'unchanged';
        }
        await closeRecord(http, record.id, body);
        return 'done';
      }),
    [http, run]
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { state, runUpdate, runClose, reset };
};
