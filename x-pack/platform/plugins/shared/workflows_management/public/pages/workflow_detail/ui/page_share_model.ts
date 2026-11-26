/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { WorkflowPageOfflineReason, WorkflowPageResponse } from '../../../../common/pages';

export const WORKFLOW_PAGE_API_VERSION = { version: '1' } as const;

export const workflowPageQueryKey = (workflowId: string, pageId: string) =>
  ['workflowPage', workflowId, pageId] as const;

export const workflowPageApiPath = (workflowId: string, pageId: string, suffix = ''): string =>
  buildPath(`/internal/workflows/workflow/{id}/pages/{pageId}${suffix}`, {
    id: workflowId,
    pageId,
  });

/** Reasons the author must fix before the page can have a link. */
const BLOCKING_REASONS = new Set<WorkflowPageOfflineReason>([
  'no_service_account',
  'service_accounts_disabled',
  'not_bound',
  'service_account_missing',
  'service_account_disabled',
  'workflow_invalid',
  'encryption_unavailable',
]);

export const isBlockingPageReason = (reason: WorkflowPageOfflineReason): boolean =>
  BLOCKING_REASONS.has(reason);

/** One sentence per reason, so an Offline badge always has an explanation. */
export const PAGE_OFFLINE_REASON_TEXT: Record<WorkflowPageOfflineReason, string> = {
  no_service_account: i18n.translate('workflows.pageShare.reason.noServiceAccount', {
    defaultMessage: 'Set settings.run_as to a service account, then save the workflow.',
  }),
  service_accounts_disabled: i18n.translate('workflows.pageShare.reason.serviceAccountsOff', {
    defaultMessage: 'Service accounts are turned off in this deployment.',
  }),
  not_bound: i18n.translate('workflows.pageShare.reason.notBound', {
    defaultMessage: 'Save the workflow to bind its service account.',
  }),
  service_account_missing: i18n.translate('workflows.pageShare.reason.accountMissing', {
    defaultMessage: 'The service account does not exist. Create it, or change settings.run_as.',
  }),
  service_account_disabled: i18n.translate('workflows.pageShare.reason.accountDisabled', {
    defaultMessage: 'The service account is disabled.',
  }),
  workflow_invalid: i18n.translate('workflows.pageShare.reason.invalid', {
    defaultMessage: 'Fix the errors in the workflow, then save it.',
  }),
  encryption_unavailable: i18n.translate('workflows.pageShare.reason.encryption', {
    defaultMessage: 'An administrator must set an encryption key for saved objects.',
  }),
  workflow_disabled: i18n.translate('workflows.pageShare.reason.workflowDisabled', {
    defaultMessage: 'The workflow is disabled. Enable it to accept submissions.',
  }),
  pages_disabled: i18n.translate('workflows.pageShare.reason.pagesDisabled', {
    defaultMessage: 'An administrator turned off all workflow pages in Advanced settings.',
  }),
  page_disabled: i18n.translate('workflows.pageShare.reason.paused', {
    defaultMessage: 'Submissions are paused but the link stays the same.',
  }),
  no_access_level: i18n.translate('workflows.pageShare.reason.notPublished', {
    defaultMessage: 'The page is not published, so there is no link yet.',
  }),
};

export interface PageShareStatusView {
  label: string;
  color: 'success' | 'warning' | 'hollow';
  /** Omitted when the badge label already says the state, as with a paused page. */
  tooltip?: string;
}

/** Header labels name the page, so they stay distinct from the workflow Enabled switch. */
export const getPageShareStatusView = (
  page: WorkflowPageResponse,
  placement: 'header' | 'modal'
): PageShareStatusView => {
  if (page.status.online) {
    return {
      label:
        placement === 'header'
          ? i18n.translate('workflows.pageShare.status.pageLive', { defaultMessage: 'Page live' })
          : i18n.translate('workflows.pageShare.status.live', { defaultMessage: 'Live' }),
      color: 'success',
      tooltip: i18n.translate('workflows.pageShare.status.liveTooltip', {
        defaultMessage: 'The page is accepting submissions.',
      }),
    };
  }
  if (page.access == null) {
    return {
      label: i18n.translate('workflows.pageShare.status.notPublished', {
        defaultMessage: 'Not published',
      }),
      color: 'hollow',
      tooltip: i18n.translate('workflows.pageShare.status.notPublishedTooltip', {
        defaultMessage: 'Publish the page to get a link.',
      }),
    };
  }
  // Pausing is explained under the toggle, so it does not also become a hover tooltip.
  const explanation = page.status.reasons
    .filter((reason) => reason !== 'page_disabled' && reason !== 'no_access_level')
    .map((reason) => PAGE_OFFLINE_REASON_TEXT[reason])
    .join(' ');
  return {
    label:
      placement === 'header'
        ? i18n.translate('workflows.pageShare.status.pageOffline', {
            defaultMessage: 'Page offline',
          })
        : i18n.translate('workflows.pageShare.status.offline', { defaultMessage: 'Offline' }),
    color: 'warning',
    tooltip: explanation || undefined,
  };
};
