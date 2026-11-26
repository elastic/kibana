/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiCode,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { buildPath, isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import type { WorkflowPageOfflineReason, WorkflowPageResponse } from '../../../../common/pages';
import { useKibana } from '../../../hooks/use_kibana';

const API_VERSION = { version: '1' } as const;
const PAGE_API_PATH = '/internal/workflows/workflow/{id}/pages/{pageId}';

/** Reasons the author must fix elsewhere before the page can have a link. */
const BLOCKER_TEXT: Partial<Record<WorkflowPageOfflineReason, string>> = {
  no_service_account: i18n.translate('workflows.pageShare.blocker.noServiceAccount', {
    defaultMessage: 'Set settings.run_as to a service account, then save the workflow.',
  }),
  service_accounts_disabled: i18n.translate('workflows.pageShare.blocker.serviceAccountsOff', {
    defaultMessage: 'Service accounts are turned off in this deployment.',
  }),
  not_bound: i18n.translate('workflows.pageShare.blocker.notBound', {
    defaultMessage: 'Save the workflow to bind its service account.',
  }),
  service_account_missing: i18n.translate('workflows.pageShare.blocker.accountMissing', {
    defaultMessage: 'The service account does not exist. Create it, or change settings.run_as.',
  }),
  service_account_disabled: i18n.translate('workflows.pageShare.blocker.accountDisabled', {
    defaultMessage: 'The service account is disabled.',
  }),
  workflow_invalid: i18n.translate('workflows.pageShare.blocker.invalid', {
    defaultMessage: 'Fix the errors in the workflow, then save it.',
  }),
  encryption_unavailable: i18n.translate('workflows.pageShare.blocker.encryption', {
    defaultMessage: 'An administrator must set an encryption key for saved objects.',
  }),
};

/** Reasons that keep a published page offline until someone changes a setting elsewhere. */
const WARNING_TEXT: Partial<Record<WorkflowPageOfflineReason, string>> = {
  workflow_disabled: i18n.translate('workflows.pageShare.warning.workflowDisabled', {
    defaultMessage: 'The workflow is disabled. Enable it to accept submissions.',
  }),
  pages_disabled: i18n.translate('workflows.pageShare.warning.pagesDisabled', {
    defaultMessage: 'An administrator turned off all workflow pages in Advanced settings.',
  }),
};

const NO_MANAGE_PRIVILEGE = i18n.translate('workflows.pageShare.noManagePrivilege', {
  defaultMessage: 'You need the Manage pages privilege.',
});
const COPY_LINK = i18n.translate('workflows.pageShare.copyLink', { defaultMessage: 'Copy link' });
const OPEN_PAGE = i18n.translate('workflows.pageShare.openPage', { defaultMessage: 'Open page' });
const ROTATE_LINK = i18n.translate('workflows.pageShare.rotate', { defaultMessage: 'Rotate link' });
const UNPUBLISH = i18n.translate('workflows.pageShare.unpublish', { defaultMessage: 'Unpublish' });

const CONFIRM = {
  rotate: {
    Callout: KbnWarningCallout,
    title: i18n.translate('workflows.pageShare.rotateConfirmTitle', {
      defaultMessage: 'Rotate the link?',
    }),
    text: i18n.translate('workflows.pageShare.rotateConfirmText', {
      defaultMessage: 'The current link stops working at once. Share the new link again.',
    }),
    confirm: ROTATE_LINK,
  },
  unpublish: {
    Callout: KbnDangerCallout,
    title: i18n.translate('workflows.pageShare.unpublishConfirmTitle', {
      defaultMessage: 'Unpublish the page?',
    }),
    text: i18n.translate('workflows.pageShare.unpublishConfirmText', {
      defaultMessage: 'The link stops working. Publish again to bring back the same link.',
    }),
    confirm: UNPUBLISH,
  },
} as const;

/** Asks before a change that breaks the current link. */
const ConfirmCallout = ({
  kind,
  isLoading,
  onConfirm,
  onCancel,
}: {
  kind: keyof typeof CONFIRM;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { Callout, title, text, confirm } = CONFIRM[kind];
  return (
    <Callout
      title={title}
      text={text}
      size="s"
      data-test-subj={`workflowPageShareConfirm-${kind}`}
      actionProps={{
        primary: {
          children: confirm,
          onClick: onConfirm,
          isLoading,
          'data-test-subj': 'workflowPageShareConfirm',
        },
        secondary: {
          children: i18n.translate('workflows.pageShare.cancel', { defaultMessage: 'Cancel' }),
          onClick: onCancel,
        },
      }}
    />
  );
};

type Action = 'publish' | 'unpublish' | 'enable' | 'disable' | 'rotate';

/** The server's message for an HTTP error, so a 403 says which privilege is missing. */
const getErrorMessage = (error: unknown): string =>
  isHttpFetchError(error)
    ? (error.body as { message?: string } | undefined)?.message ?? error.message
    : error instanceof Error
    ? error.message
    : String(error);

export interface WorkflowPageShareModalProps {
  workflowId: string;
  pageId: string;
  /** The `settings.run_as` of the saved workflow, shown so the author knows who submissions run as. */
  serviceAccountId?: string;
  onClose: () => void;
}

export const WorkflowPageShareModal = ({
  workflowId,
  pageId,
  serviceAccountId,
  onClose,
}: WorkflowPageShareModalProps) => {
  const { http, application } = useKibana().services;
  // Pages are behind a feature flag, so their privilege is not in the shared capabilities hook.
  const canManageWorkflowPages = Boolean(
    application.capabilities[WORKFLOWS_MANAGEMENT_FEATURE_ID]?.[
      WorkflowsManagementUiActions.managePages
    ]
  );
  const queryClient = useQueryClient();
  const titleId = useGeneratedHtmlId();
  const pagePath = (suffix = '') =>
    buildPath(`${PAGE_API_PATH}${suffix}`, { id: workflowId, pageId });
  const queryKey = useMemo(() => ['workflowPage', workflowId, pageId], [workflowId, pageId]);

  const [pending, setPending] = useState<Action>();
  const [actionError, setActionError] = useState<string>();
  const [confirming, setConfirming] = useState<'rotate' | 'unpublish'>();

  const {
    data: page,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => http.get<WorkflowPageResponse>(pagePath(), API_VERSION),
    refetchOnWindowFocus: false,
  });

  const run = useCallback(
    async (action: Action, request: () => Promise<unknown>) => {
      setPending(action);
      setActionError(undefined);
      try {
        await request();
        setConfirming(undefined);
        await queryClient.invalidateQueries({ queryKey });
      } catch (error) {
        setActionError(getErrorMessage(error));
      } finally {
        setPending(undefined);
      }
    },
    [queryClient, queryKey]
  );

  const setAccess = (published: boolean) =>
    run(published ? 'publish' : 'unpublish', () =>
      http.put(pagePath('/access'), {
        ...API_VERSION,
        body: JSON.stringify({ access: published ? { level: 'secret_link' } : null }),
      })
    );
  const setEnabled = (enabled: boolean) =>
    run(enabled ? 'enable' : 'disable', () =>
      http.put(pagePath('/enabled'), { ...API_VERSION, body: JSON.stringify({ enabled }) })
    );
  const rotate = () => run('rotate', () => http.post(pagePath('/_rotate'), API_VERSION));

  const reasons = page?.status.reasons ?? [];
  const blockers = reasons.filter((reason) => BLOCKER_TEXT[reason]);
  const warnings = reasons.filter((reason) => WARNING_TEXT[reason]);
  const isPublished = page?.access != null;
  const absoluteUrl = page ? new URL(page.url, window.location.origin).href : '';

  const runsAs = serviceAccountId ? (
    <FormattedMessage
      id="workflows.pageShare.runsAs"
      defaultMessage="Anyone with the link can submit this form. Submissions run as {account}."
      values={{ account: <strong>{serviceAccountId}</strong> }}
    />
  ) : null;

  const withManageTooltip = (button: React.ReactElement) =>
    canManageWorkflowPages ? (
      button
    ) : (
      <EuiToolTip content={NO_MANAGE_PRIVILEGE}>{button}</EuiToolTip>
    );

  const renderBody = () => {
    if (loadError) {
      return (
        <KbnDangerCallout
          title={i18n.translate('workflows.pageShare.loadError', {
            defaultMessage: 'Unable to load the page',
          })}
          text={getErrorMessage(loadError)}
          actionProps={{
            primary: {
              children: i18n.translate('workflows.pageShare.retry', { defaultMessage: 'Retry' }),
              onClick: () => refetch(),
            },
          }}
        />
      );
    }
    if (!page) {
      return <EuiSkeletonText lines={4} />;
    }
    if (blockers.length > 0) {
      return (
        <KbnDangerCallout
          title={i18n.translate('workflows.pageShare.blockedTitle', {
            defaultMessage: "This page can't run yet",
          })}
          data-test-subj="workflowPageShareBlockers"
        >
          <ul>
            {blockers.map((reason) => (
              <li key={reason}>{BLOCKER_TEXT[reason]}</li>
            ))}
          </ul>
          {serviceAccountId && (
            <p>
              <FormattedMessage
                id="workflows.pageShare.configuredAccount"
                defaultMessage="settings.run_as: {account}"
                values={{ account: <EuiCode>{serviceAccountId}</EuiCode> }}
              />
            </p>
          )}
        </KbnDangerCallout>
      );
    }
    if (!isPublished) {
      return (
        <>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="workflows.pageShare.notPublished"
                defaultMessage="Publish the page to get a link."
              />{' '}
              {runsAs}
            </p>
          </EuiText>
          <EuiSpacer />
          {withManageTooltip(
            <EuiButton
              fill
              iconType="link"
              onClick={() => setAccess(true)}
              isLoading={pending === 'publish'}
              isDisabled={!canManageWorkflowPages || pending !== undefined}
              data-test-subj="workflowPageSharePublish"
            >
              {i18n.translate('workflows.pageShare.publish', { defaultMessage: 'Publish page' })}
            </EuiButton>
          )}
        </>
      );
    }
    return (
      <>
        <EuiText size="s">
          <p>{runsAs}</p>
        </EuiText>
        <EuiSpacer />
        <EuiFormRow
          label={i18n.translate('workflows.pageShare.linkLabel', { defaultMessage: 'Page link' })}
          labelAppend={
            <EuiText size="xs">
              <EuiLink
                href={absoluteUrl}
                target="_blank"
                external
                data-test-subj="workflowPageShareOpen"
              >
                {OPEN_PAGE}
              </EuiLink>
            </EuiText>
          }
          helpText={i18n.translate('workflows.pageShare.linkHelp', {
            defaultMessage: 'Treat the link like a password. Rotate it if it leaks.',
          })}
          fullWidth
        >
          <EuiCopy
            textToCopy={absoluteUrl}
            beforeMessage={COPY_LINK}
            tooltipProps={{ anchorClassName: 'eui-displayBlock' }}
          >
            {(copy) => (
              <EuiFieldText
                value={absoluteUrl}
                readOnly
                fullWidth
                onFocus={(event) => event.target.select()}
                data-test-subj="workflowPageShareUrl"
                icon={{
                  type: 'copy',
                  side: 'right',
                  onClick: copy,
                  'aria-label': COPY_LINK,
                  'data-test-subj': 'workflowPageShareCopy',
                }}
              />
            )}
          </EuiCopy>
        </EuiFormRow>
        <EuiSpacer />
        {withManageTooltip(
          <EuiSwitch
            label={i18n.translate('workflows.pageShare.acceptSubmissions', {
              defaultMessage: 'Accept submissions',
            })}
            checked={page.enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={!canManageWorkflowPages || pending !== undefined}
            data-test-subj="workflowPageShareEnabled"
          />
        )}
        {!page.enabled && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('workflows.pageShare.offlineHelp', {
                  defaultMessage: 'The page is offline. Turning it back on keeps the same link.',
                })}
              </p>
            </EuiText>
          </>
        )}
        {warnings.map((reason) => (
          <React.Fragment key={reason}>
            <EuiSpacer size="m" />
            <KbnWarningCallout title={WARNING_TEXT[reason]} size="s" />
          </React.Fragment>
        ))}
        <EuiSpacer size="m" />
        {confirming ? (
          <ConfirmCallout
            kind={confirming}
            isLoading={pending !== undefined}
            onConfirm={confirming === 'rotate' ? rotate : () => setAccess(false)}
            onCancel={() => setConfirming(undefined)}
          />
        ) : (
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {withManageTooltip(
                <EuiButton
                  size="s"
                  color="warning"
                  onClick={() => setConfirming('rotate')}
                  isDisabled={!canManageWorkflowPages || pending !== undefined}
                  data-test-subj="workflowPageShareRotate"
                >
                  {ROTATE_LINK}
                </EuiButton>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {withManageTooltip(
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={() => setConfirming('unpublish')}
                  isDisabled={!canManageWorkflowPages || pending !== undefined}
                  data-test-subj="workflowPageShareUnpublish"
                >
                  {UNPUBLISH}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    );
  };

  const statusBadge = page && (
    <EuiBadge
      color={page.status.online ? 'success' : 'hollow'}
      data-test-subj="workflowPageShareStatus"
    >
      {page.status.online
        ? i18n.translate('workflows.pageShare.live', { defaultMessage: 'Live' })
        : isPublished
        ? i18n.translate('workflows.pageShare.offline', { defaultMessage: 'Offline' })
        : i18n.translate('workflows.pageShare.draft', { defaultMessage: 'Not published' })}
    </EuiBadge>
  );

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} maxWidth={560}>
      <EuiModalHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id={titleId}>
              {i18n.translate('workflows.pageShare.title', { defaultMessage: 'Share page' })}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        {actionError && (
          <>
            <KbnDangerCallout
              title={actionError}
              size="s"
              onDismiss={() => setActionError(undefined)}
              data-test-subj="workflowPageShareActionError"
            />
            <EuiSpacer size="m" />
          </>
        )}
        {renderBody()}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} data-test-subj="workflowPageShareDone">
          {i18n.translate('workflows.pageShare.done', { defaultMessage: 'Done' })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
