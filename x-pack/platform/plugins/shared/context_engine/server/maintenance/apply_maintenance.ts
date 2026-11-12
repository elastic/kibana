/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceChange } from '../../common/step_types/gather_maintenance';
import { tombstoneKi, writeKi, type ApplyContext, type DeleteResult } from '../dreaming/apply';
import type { MaintenanceGroup } from './resolve_changes';

export interface MaintenanceApplyResult {
  written: number;
  tombstoned: string[];
  changes: MaintenanceChange[];
  rejected: Array<{ item: string; reason: string }>;
}

const REFUSED: Partial<Record<DeleteResult, string>> = {
  rejected: 'it has different permissions than the batch',
  person_edited: 'a person edited it',
};

export const emptyApplyResult = (): MaintenanceApplyResult => ({
  written: 0,
  tombstoned: [],
  changes: [],
  rejected: [],
});

/**
 * Applies each group in order: the kept item, then the moved relationships, then the tombstones.
 * A group whose kept item cannot be written changes nothing else.
 */
export const applyMaintenanceGroups = async (
  context: ApplyContext,
  groups: readonly MaintenanceGroup[],
  result: MaintenanceApplyResult = emptyApplyResult()
): Promise<MaintenanceApplyResult> => {
  for (const { item, writes, moves, tombstones, changes } of groups) {
    let refused: string | undefined;
    for (const { id, build } of writes) {
      const written = await writeKi(context, id, build);
      if (written === 'rejected') {
        refused = `${id} has different permissions than the batch`;
        break;
      }
      if (written !== 'skipped') {
        result.written += 1;
      }
    }
    if (refused) {
      result.rejected.push({ item, reason: refused });
      continue;
    }
    for (const { id, document } of moves) {
      const written = await writeKi(context, id, (current) => (current ? undefined : document));
      if (written === 'created') {
        result.written += 1;
      }
    }
    const kept = new Set<string>();
    for (const id of tombstones) {
      const deleted = await tombstoneKi(context, id);
      const reason = REFUSED[deleted];
      if (reason) {
        result.rejected.push({ item: `${item}: tombstone ${id}`, reason });
        kept.add(id);
      } else if (deleted === 'deleted') {
        result.tombstoned.push(id);
      }
    }
    result.changes.push(...changes.filter(({ id }) => !kept.has(id)));
  }
  return result;
};
