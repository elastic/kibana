/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { findStatusByKey, getRecordStatus } from '../../../../../common/investigations/statuses';
import type { CaseStatusConfiguration } from '../../../../../common/investigations/statuses';
import type {
  InvestigationPriority,
  InvestigationRecord,
} from '../../../../../common/investigations/types';
import { useCasesContext } from '../../../../components/cases_context/use_cases_context';
import { useBulkRecordRun } from '../../../hooks';
import type { BulkRecordResult } from '../../../hooks';
import { useInvestigationsServices } from '../../../services';
import { PauseReasonModal } from '../../modals/pause_modal';
import { BulkActionsBar } from './bulk_actions_bar';
import type { BulkDialogKind } from './bulk_actions_bar';
import { BulkAssignDialog } from './bulk_assign_dialog';
import { BulkCloseDialog } from './bulk_close_dialog';
import { BulkPriorityDialog } from './bulk_priority_dialog';
import { BulkResultsModal } from './bulk_results_modal';
import { BulkTagsDialog } from './bulk_tags_dialog';
import * as i18n from './translations';

export interface QueueBulkActionsProps {
  /** The selected investigations (one page, at most 100). */
  selected: InvestigationRecord[];
  statuses: CaseStatusConfiguration[];
  onClear: () => void;
}

type OpenDialog = { kind: BulkDialogKind } | { kind: 'pause'; statusKey: string } | null;

/**
 * The bulk bar for the queue and everything it opens: one input dialog per action, then one
 * write per selected investigation with progress and a result for each.
 */
export const QueueBulkActions: React.FC<QueueBulkActionsProps> = ({
  selected,
  statuses,
  onClear,
}) => {
  const { permissions } = useCasesContext();
  const { notifications } = useInvestigationsServices();
  const { state: run, runUpdate, runClose, reset } = useBulkRecordRun();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [runTitle, setRunTitle] = useState('');

  const statusChoices = useMemo(
    () => statuses.filter(({ category }) => category !== 'closed'),
    [statuses]
  );
  const count = selected.length;

  const closeDialog = useCallback(() => setDialog(null), []);

  const start = useCallback(
    async (title: string, perform: () => Promise<BulkRecordResult[]>) => {
      setDialog(null);
      setRunTitle(title);
      const results = await perform();
      const done = results.filter(({ outcome }) => outcome === 'done').length;
      const blocked = results.filter(({ outcome }) => outcome === 'blocked').length;
      if (blocked > 0) {
        notifications.toasts.addWarning({ title: i18n.SUMMARY_TOAST_BLOCKED(done, blocked) });
      } else {
        notifications.toasts.addSuccess({
          title: i18n.SUMMARY_TOAST_DONE(done, results.length - done),
        });
      }
    },
    [notifications.toasts]
  );

  const assign = (uids: string[]) =>
    start(i18n.ASSIGN_RUNNING, () =>
      runUpdate(selected, (record) => {
        const missing = uids.filter((uid) => !record.assignees.includes(uid));
        return missing.length === 0 ? null : { assignees: [...record.assignees, ...missing] };
      })
    );

  const changePriority = (priority: InvestigationPriority, note: string | undefined) =>
    start(i18n.PRIORITY_RUNNING, () =>
      runUpdate(selected, (record) =>
        record.priority === priority ? null : { priority, ...(note ? { priority_note: note } : {}) }
      )
    );

  const addTags = (tags: string[]) =>
    start(i18n.TAGS_RUNNING, () =>
      runUpdate(selected, (record) => {
        const missing = tags.filter((tag) => !record.tags.includes(tag));
        return missing.length === 0 ? null : { tags: [...record.tags, ...missing] };
      })
    );

  const closeSelected = (closeReason: string, notes: string | undefined) =>
    start(i18n.CLOSE_RUNNING, () =>
      runClose(selected, { close_reason: closeReason, ...(notes ? { summary: notes } : {}) })
    );

  const moveToStatus = (statusKey: string, pauseReason?: string) => {
    const target = findStatusByKey(statuses, statusKey);
    if (!target) {
      return Promise.resolve();
    }
    return start(i18n.STATUS_RUNNING(target.label), () =>
      runUpdate(selected, (record) => {
        const isAlreadyThere = getRecordStatus(statuses, record).key === statusKey;
        if (isAlreadyThere && (pauseReason === undefined || record.pause_reason === pauseReason)) {
          return null;
        }
        return {
          status_key: statusKey,
          ...(pauseReason === undefined ? {} : { pause_reason: pauseReason }),
        };
      })
    );
  };

  const onPickStatus = (statusKey: string) => {
    const target = findStatusByKey(statuses, statusKey);
    if (target?.pausesTimeTracking) {
      setDialog({ kind: 'pause', statusKey });
      return;
    }
    void moveToStatus(statusKey);
  };

  const closeResults = () => {
    if (run.phase === 'running') {
      return;
    }
    reset();
    onClear();
  };

  return (
    <>
      {count > 0 ? (
        <>
          <BulkActionsBar
            count={count}
            statuses={statusChoices}
            canAssign={permissions.assign}
            onOpenDialog={(kind) => setDialog({ kind })}
            onPickStatus={onPickStatus}
            onClear={onClear}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      {dialog?.kind === 'assign' ? (
        <BulkAssignDialog
          count={count}
          onConfirm={(uids) => void assign(uids)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'priority' ? (
        <BulkPriorityDialog
          count={count}
          onConfirm={(priority, note) => void changePriority(priority, note)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'tags' ? (
        <BulkTagsDialog
          count={count}
          onConfirm={(tags) => void addTags(tags)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'close' ? (
        <BulkCloseDialog
          count={count}
          onConfirm={(reason, notes) => void closeSelected(reason, notes)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'pause' ? (
        <PauseReasonModal
          statusKey={dialog.statusKey}
          isSaving={false}
          getBody={i18n.PAUSE_BULK_BODY}
          onConfirm={(reason) => void moveToStatus(dialog.statusKey, reason)}
          onClose={closeDialog}
        />
      ) : null}
      {run.phase !== 'idle' ? (
        <BulkResultsModal title={runTitle} run={run} onClose={closeResults} />
      ) : null}
    </>
  );
};
QueueBulkActions.displayName = 'QueueBulkActions';
