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

const EDITED_TOOLTIP = i18n.translate('xpack.notebook.status.staleEditedTooltip', {
  defaultMessage: 'The query was edited but not run. Run the cell to update its results.',
});

const MANUAL_TOOLTIP = i18n.translate('xpack.notebook.status.staleManualTooltip', {
  defaultMessage: 'This cell is in manual run mode and has not run yet. Run it to see results.',
});

const formatParams = (params: readonly string[]): string =>
  params.map((param) => `?${param}`).join(', ');

const getChangedParamsTooltip = (params: readonly string[]): string =>
  i18n.translate('xpack.notebook.status.staleChangedParamsTooltip', {
    defaultMessage:
      '{params} changed since this cell last ran. It is in manual run mode, so run it to update its results.',
    values: { params: formatParams(params) },
  });

const getChangedUpstreamTooltip = (params: readonly string[], names: readonly string[]): string =>
  i18n.translate('xpack.notebook.status.staleChangedUpstreamTooltip', {
    defaultMessage:
      '{params} changed, but {count, plural, one {{names} has} other {{names} have}} not run yet. Run {count, plural, one {it} other {them}} to update this cell.',
    values: { params: formatParams(params), names: names.join(', '), count: names.length },
  });

const getUpdatedSourceTooltip = (names: readonly string[]): string =>
  i18n.translate('xpack.notebook.status.staleUpdatedSourceTooltip', {
    defaultMessage:
      '{names} has new results since this cell last ran. It is in manual run mode, so run it to update.',
    values: { names: names.join(', ') },
  });

const getUpstreamTooltip = (names: readonly string[]): string =>
  i18n.translate('xpack.notebook.status.staleUpstreamTooltip', {
    defaultMessage:
      'Depends on {count, plural, one {a stale cell} other {stale cells}}: {names}. Run {count, plural, one {it} other {them}} to update this cell.',
    values: { count: names.length, names: names.join(', ') },
  });

const getStaleTooltip = (
  reason: StaleReason,
  parentNames: readonly string[],
  changedParams: readonly string[]
): string => {
  if (reason === 'edited') return EDITED_TOOLTIP;
  if (reason === 'upstream') {
    return changedParams.length > 0
      ? getChangedUpstreamTooltip(changedParams, parentNames)
      : getUpstreamTooltip(parentNames);
  }
  if (changedParams.length > 0) return getChangedParamsTooltip(changedParams);
  if (parentNames.length > 0) return getUpdatedSourceTooltip(parentNames);
  return MANUAL_TOOLTIP;
};

export const CellStatusBadge = ({ runtime }: { runtime: CellRuntime }) => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const { color, label } = STATUS_BADGES[runtime.status];

  const getTooltip = (): string | undefined => {
    const { status, error, staleReason, staleParents = [], changedParams = [] } = runtime;
    if (status === 'blocked') return BLOCKED_TOOLTIP;
    if (status !== 'stale' || !staleReason) return error;
    const parentNames = staleParents.flatMap((parentId) => {
      const parent = cells[parentId];
      return parent ? [parent.name] : [];
    });
    return getStaleTooltip(staleReason, parentNames, changedParams);
  };
  const tooltip = getTooltip();
  const badge = (
    <EuiBadge color={color} data-test-subj={`notebookCellStatus-${runtime.status}`}>
      {label}
    </EuiBadge>
  );
  return tooltip ? <EuiToolTip content={tooltip}>{badge}</EuiToolTip> : badge;
};
