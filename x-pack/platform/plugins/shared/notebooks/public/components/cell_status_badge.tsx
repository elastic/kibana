/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CellRuntime, CellStatus, StaleReason } from '../model/types';

const STATUS_BADGES: Record<CellStatus, { color: string; label: string }> = {
  idle: {
    color: 'hollow',
    label: i18n.translate('xpack.notebook.status.idle', { defaultMessage: 'Idle' }),
  },
  stale: {
    color: 'warning',
    label: i18n.translate('xpack.notebook.status.stale', { defaultMessage: 'Stale' }),
  },
  running: {
    color: 'primary',
    label: i18n.translate('xpack.notebook.status.running', { defaultMessage: 'Running' }),
  },
  done: {
    color: 'success',
    label: i18n.translate('xpack.notebook.status.done', { defaultMessage: 'Done' }),
  },
  error: {
    color: 'danger',
    label: i18n.translate('xpack.notebook.status.error', { defaultMessage: 'Error' }),
  },
  blocked: {
    color: 'default',
    label: i18n.translate('xpack.notebook.status.blocked', { defaultMessage: 'Blocked' }),
  },
};

const BLOCKED_TOOLTIP = i18n.translate('xpack.notebook.status.blockedTooltip', {
  defaultMessage: 'An upstream cell has an error, so this cell did not run.',
});

const STALE_TOOLTIPS: Record<StaleReason, string> = {
  edited: i18n.translate('xpack.notebook.status.staleEditedTooltip', {
    defaultMessage: 'The query was edited but not run. Run the cell to update its results.',
  }),
  manual: i18n.translate('xpack.notebook.status.staleManualTooltip', {
    defaultMessage:
      'This cell is in manual run mode and its results may be out of date. Run the cell to update them.',
  }),
  upstream: i18n.translate('xpack.notebook.status.staleUpstreamTooltip', {
    defaultMessage: 'An upstream cell is stale, so this cell is waiting for it to run.',
  }),
};

const getTooltip = ({ status, error, staleReason }: CellRuntime): string | undefined => {
  if (status === 'blocked') return BLOCKED_TOOLTIP;
  if (status === 'stale' && staleReason) return STALE_TOOLTIPS[staleReason];
  return error;
};

export const CellStatusBadge = ({ runtime }: { runtime: CellRuntime }) => {
  const { color, label } = STATUS_BADGES[runtime.status];
  const tooltip = getTooltip(runtime);
  const badge = (
    <EuiBadge color={color} data-test-subj={`notebookCellStatus-${runtime.status}`}>
      {label}
    </EuiBadge>
  );
  return tooltip ? <EuiToolTip content={tooltip}>{badge}</EuiToolTip> : badge;
};
