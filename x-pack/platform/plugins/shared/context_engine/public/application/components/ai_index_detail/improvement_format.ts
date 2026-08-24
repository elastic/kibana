/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ImprovementAction,
  ImprovementEnvelope,
  ImprovementStatus,
} from '../../../../common/http_api/improvements';

const ACTION_LABELS: Record<ImprovementAction, string> = {
  add_ki: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.addKi', {
    defaultMessage: 'Add knowledge indicator',
  }),
  edit_ki: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.editKi', {
    defaultMessage: 'Edit knowledge indicator',
  }),
  remove_ki: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.removeKi', {
    defaultMessage: 'Remove knowledge indicator',
  }),
  add_workflow: i18n.translate(
    'xpack.contextEngine.aiIndexDetail.improvements.action.addWorkflow',
    {
      defaultMessage: 'Add automation',
    }
  ),
  edit_workflow: i18n.translate(
    'xpack.contextEngine.aiIndexDetail.improvements.action.editWorkflow',
    { defaultMessage: 'Edit automation' }
  ),
  remove_workflow: i18n.translate(
    'xpack.contextEngine.aiIndexDetail.improvements.action.removeWorkflow',
    { defaultMessage: 'Remove automation' }
  ),
};

export const actionLabel = (action: ImprovementAction): string => ACTION_LABELS[action] ?? action;

/** Additions read as new, removals as destructive; edits stay neutral. */
export const actionBadgeColor = (action: ImprovementAction): string => {
  if (action === 'add_ki' || action === 'add_workflow') {
    return 'success';
  }
  if (action === 'remove_ki' || action === 'remove_workflow') {
    return 'danger';
  }
  return 'hollow';
};

const STATUS_LABELS: Record<ImprovementStatus, string> = {
  proposed: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.proposed', {
    defaultMessage: 'Awaiting review',
  }),
  applied: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.applied', {
    defaultMessage: 'Applied',
  }),
  rejected: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.rejected', {
    defaultMessage: 'Rejected',
  }),
  failed: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.failed', {
    defaultMessage: 'Failed to apply',
  }),
};

export const statusLabel = (status: ImprovementStatus): string => STATUS_LABELS[status] ?? status;

const STATUS_COLORS: Record<ImprovementStatus, string> = {
  proposed: 'primary',
  applied: 'success',
  rejected: 'default',
  failed: 'danger',
};

export const statusBadgeColor = (status: ImprovementStatus): string =>
  STATUS_COLORS[status] ?? 'default';

/**
 * The KI or workflow the suggestion changes, so a reviewer can tell two edits apart without
 * opening the payload. Additions have no target: they create theirs.
 */
export const targetLabel = (improvement: ImprovementEnvelope): string | undefined =>
  improvement.target?.ki_id ?? improvement.target?.workflow_id;

/** A suggestion the reviewer still has to act on. `failed` is retryable, so it counts as open. */
export const isOpen = (status: ImprovementStatus): boolean =>
  status === 'proposed' || status === 'failed';
