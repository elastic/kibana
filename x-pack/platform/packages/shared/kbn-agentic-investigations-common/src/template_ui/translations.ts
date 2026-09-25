/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TEMPLATE_UI_LABELS = Object.freeze({
  /** Names the content for `EuiSkeletonLoading`, which composes it into "Loading/Loaded {label}". */
  contentLabel: i18n.translate('xpack.alertzero.templateUi.contentLabel', {
    defaultMessage: 'Investigation',
  }),
  loadErrorTitle: i18n.translate('xpack.alertzero.templateUi.loadErrorTitle', {
    defaultMessage: 'Unable to load this investigation',
  }),
  notFoundTitle: i18n.translate('xpack.alertzero.templateUi.notFoundTitle', {
    defaultMessage: 'No investigation for this conversation',
  }),
  status: i18n.translate('xpack.alertzero.templateUi.status', {
    defaultMessage: 'Status',
  }),
  assignees: i18n.translate('xpack.alertzero.templateUi.assignees', {
    defaultMessage: 'Assignees',
  }),
  unassigned: i18n.translate('xpack.alertzero.templateUi.unassigned', {
    defaultMessage: 'Unassigned',
  }),
});

/** One-line summaries for the conversation events the timeline surfaces. */
export const TIMELINE_EVENT_LABELS = Object.freeze({
  promptResponse: i18n.translate('xpack.alertzero.templateUi.timeline.promptResponse', {
    defaultMessage: 'Answered a question from the agent',
  }),
  executionStarted: (trigger: string) =>
    i18n.translate('xpack.alertzero.templateUi.timeline.executionStarted', {
      defaultMessage: 'Agent run started ({trigger})',
      values: { trigger },
    }),
  executionCompleted: i18n.translate('xpack.alertzero.templateUi.timeline.executionCompleted', {
    defaultMessage: 'Agent run finished',
  }),
  promptRequested: i18n.translate('xpack.alertzero.templateUi.timeline.promptRequested', {
    defaultMessage: 'Agent asked for input',
  }),
  executionFailed: (reason: string) =>
    i18n.translate('xpack.alertzero.templateUi.timeline.executionFailed', {
      defaultMessage: 'Agent run failed: {reason}',
      values: { reason },
    }),
  executionAborted: i18n.translate('xpack.alertzero.templateUi.timeline.executionAborted', {
    defaultMessage: 'Agent run stopped',
  }),
  attachmentAdded: (type: string) =>
    i18n.translate('xpack.alertzero.templateUi.timeline.attachmentAdded', {
      defaultMessage: 'Added a {type} attachment',
      values: { type },
    }),
  attachmentUpdated: (type: string) =>
    i18n.translate('xpack.alertzero.templateUi.timeline.attachmentUpdated', {
      defaultMessage: 'Updated a {type} attachment',
      values: { type },
    }),
  attachmentDeleted: (type: string) =>
    i18n.translate('xpack.alertzero.templateUi.timeline.attachmentDeleted', {
      defaultMessage: 'Removed a {type} attachment',
      values: { type },
    }),
});
