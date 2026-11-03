/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellRuntime, CellStatus, StaleReason } from '../model/types';
import { useNotebook } from './notebook_context';

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

const STALE_TOOLTIPS: Record<Exclude<StaleReason, 'upstream'>, string> = {
  edited: i18n.translate('xpack.notebook.status.staleEditedTooltip', {
    defaultMessage: 'The query was edited but not run. Run the cell to update its results.',
  }),
  manual: i18n.translate('xpack.notebook.status.staleManualTooltip', {
    defaultMessage:
      'This cell is in manual run mode and its results may be out of date. Run the cell to update them.',
  }),
};

const getUpstreamTooltip = (names: readonly string[]): string =>
  i18n.translate('xpack.notebook.status.staleUpstreamTooltip', {
    defaultMessage:
      'Depends on {count, plural, one {a stale cell} other {stale cells}}: {names}. Run {count, plural, one {it} other {them}} to update this cell.',
    values: { count: names.length, names: names.join(', ') },
  });

export const CellStatusBadge = ({ runtime }: { runtime: CellRuntime }) => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const { color, label } = STATUS_BADGES[runtime.status];

  const getTooltip = (): string | undefined => {
    const { status, error, staleReason, staleParents = [] } = runtime;
    if (status === 'blocked') return BLOCKED_TOOLTIP;
    if (status !== 'stale' || !staleReason) return error;
    if (staleReason !== 'upstream') return STALE_TOOLTIPS[staleReason];
    return getUpstreamTooltip(
      staleParents.flatMap((parentId) => {
        const parent = cells[parentId];
        return parent ? [parent.name] : [];
      })
    );
  };
  const tooltip = getTooltip();
  const badge = (
    <EuiBadge color={color} data-test-subj={`notebookCellStatus-${runtime.status}`}>
      {label}
    </EuiBadge>
  );
  return tooltip ? <EuiToolTip content={tooltip}>{badge}</EuiToolTip> : badge;
};
