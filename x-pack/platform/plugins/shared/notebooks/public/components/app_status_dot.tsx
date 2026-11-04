/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { NotebookApp } from '../../common/types';
import { getAppStatusGroups, type AttentionStatus } from '../model/app_layout';
import { useNotebook } from './notebook_context';
import { useCellStatuses } from './use_cell_statuses';

const DOT_COLORS: Record<AttentionStatus, string> = {
  error: 'danger',
  blocked: 'text',
  stale: 'warning',
  idle: 'subdued',
};

const STATUS_LABELS: Record<AttentionStatus, string> = {
  error: i18n.translate('xpack.notebook.app.status.error', { defaultMessage: 'Errors' }),
  blocked: i18n.translate('xpack.notebook.app.status.blocked', { defaultMessage: 'Blocked' }),
  stale: i18n.translate('xpack.notebook.app.status.stale', { defaultMessage: 'Stale' }),
  idle: i18n.translate('xpack.notebook.app.status.idle', { defaultMessage: 'Not run' }),
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

  const description = groups.map(({ status }) => STATUS_LABELS[status]).join(', ');
  return (
    <EuiIconTip
      type="dot"
      color={DOT_COLORS[worst.status]}
      content={description}
      aria-label={description}
      iconProps={{ 'data-test-subj': `notebookAppStatus-${worst.status}` }}
    />
  );
};
