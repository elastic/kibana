/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { combineLatest, map } from 'rxjs';
import type { NotebookApp } from '../../common/types';
import { getAppStatusGroups, type AppStatusGroup, type AttentionStatus } from '../model/app_layout';
import type { CellStatus } from '../model/types';
import { useNotebook } from './notebook_context';

const DOT_COLORS: Record<AttentionStatus, string> = {
  error: 'danger',
  blocked: 'text',
  stale: 'warning',
  idle: 'subdued',
};

const describeGroup = ({ status, names }: AppStatusGroup): string => {
  const list = names.join(', ');
  switch (status) {
    case 'error':
      return i18n.translate('xpack.notebook.app.status.error', {
        defaultMessage: 'Failed to run: {names}',
        values: { names: list },
      });
    case 'blocked':
      return i18n.translate('xpack.notebook.app.status.blocked', {
        defaultMessage: 'Blocked by an upstream error: {names}',
        values: { names: list },
      });
    case 'stale':
      return i18n.translate('xpack.notebook.app.status.stale', {
        defaultMessage: 'Out of date, run to update: {names}',
        values: { names: list },
      });
    case 'idle':
      return i18n.translate('xpack.notebook.app.status.idle', {
        defaultMessage: 'Not run yet: {names}',
        values: { names: list },
      });
  }
};

const useCellStatuses = (cellIds: readonly string[]): Readonly<Record<string, CellStatus>> => {
  const { store } = useNotebook();
  const [statuses, setStatuses] = useState<Readonly<Record<string, CellStatus>>>({});
  useEffect(() => {
    if (cellIds.length === 0) {
      setStatuses({});
      return;
    }
    const subscription = combineLatest(
      cellIds.map((id) => store.getRuntime$(id).pipe(map(({ status }) => [id, status] as const)))
    ).subscribe((entries) => setStatuses(Object.fromEntries(entries)));
    return () => subscription.unsubscribe();
  }, [store, cellIds]);
  return statuses;
};

/** A dot coloured by the most severe status among the app's cells; nothing when all are fine. */
export const AppStatusDot = ({ app }: { app: NotebookApp }) => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellIds = useMemo(() => [...new Set(app.panels.map(({ cellId }) => cellId))], [app.panels]);
  const statuses = useCellStatuses(cellIds);
  const groups = getAppStatusGroups(app, cells, (id) => statuses[id] ?? 'done');
  const [worst] = groups;
  if (!worst) return null;

  const description = groups.map(describeGroup).join('\n');
  return (
    <EuiIconTip
      type="dot"
      color={DOT_COLORS[worst.status]}
      content={<span css={{ whiteSpace: 'pre-line' }}>{description}</span>}
      aria-label={description}
      iconProps={{ 'data-test-subj': `notebookAppStatus-${worst.status}` }}
    />
  );
};
