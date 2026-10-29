/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CellRuntime, CellStatus } from '../model/types';

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

export const CellStatusBadge = ({ runtime }: { runtime: CellRuntime }) => {
  const { color, label } = STATUS_BADGES[runtime.status];
  const tooltip = runtime.status === 'blocked' ? BLOCKED_TOOLTIP : runtime.error;
  const badge = (
    <EuiBadge color={color} data-test-subj={`notebookCellStatus-${runtime.status}`}>
      {label}
    </EuiBadge>
  );
  return tooltip ? <EuiToolTip content={tooltip}>{badge}</EuiToolTip> : badge;
};
