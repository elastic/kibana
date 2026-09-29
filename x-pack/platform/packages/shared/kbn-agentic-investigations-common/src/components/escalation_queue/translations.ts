/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESCALATION_QUEUE_LABELS = Object.freeze({
  open: i18n.translate('xpack.alertzero.escalationQueue.bucket.open', {
    defaultMessage: 'Open',
  }),
  closed: i18n.translate('xpack.alertzero.escalationQueue.bucket.closed', {
    defaultMessage: 'Closed',
  }),
  emptyQueue: i18n.translate('xpack.alertzero.escalationQueue.emptyQueue', {
    defaultMessage: 'No escalations',
  }),
  nothingAttached: i18n.translate('xpack.alertzero.escalationQueue.nothingAttached', {
    defaultMessage: 'Nothing attached',
  }),
  unassigned: i18n.translate('xpack.alertzero.escalationQueue.unassigned', {
    defaultMessage: 'Unassigned',
  }),
  addAssignee: i18n.translate('xpack.alertzero.escalationQueue.addAssignee', {
    defaultMessage: 'Add or change assignees',
  }),
  closedBadge: i18n.translate('xpack.alertzero.escalationQueue.closedBadge', {
    defaultMessage: 'Closed',
  }),
  searchAssignees: i18n.translate('xpack.alertzero.escalationQueue.searchAssignees', {
    defaultMessage: 'Search for users',
  }),
  loadError: i18n.translate('xpack.alertzero.escalationQueue.loadError', {
    defaultMessage: 'Failed to load escalations',
  }),
  updatingAssignees: i18n.translate('xpack.alertzero.escalationQueue.updatingAssignees', {
    defaultMessage: 'Updating assignees…',
  }),
  showMore: (remaining: number) =>
    i18n.translate('xpack.alertzero.escalationQueue.showMore', {
      defaultMessage: 'Show more ({remaining})',
      values: { remaining },
    }),
});
