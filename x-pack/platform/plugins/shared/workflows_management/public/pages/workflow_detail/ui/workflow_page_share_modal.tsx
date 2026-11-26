/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
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

/** Reasons the author must fix outside this modal before the page can have a link. */
const BLOCKER_TEXT: Partial<Record<WorkflowPageOfflineReason, string>> = {
  no_service_account: i18n.translate('workflows.pageShare.blocker.noServiceAccount', {
    defaultMessage:
      'Set settings.run_as to a service account and save the workflow. Visitors have no Kibana identity, so submissions run as that account.',
  }),
  service_accounts_disabled: i18n.translate('workflows.pageShare.blocker.serviceAccountsOff', {
    defaultMessage: 'Service accounts are turned off on this deployment.',
  }),
  not_bound: i18n.translate('workflows.pageShare.blocker.notBound', {
    defaultMessage:
      'The service account in settings.run_as is not bound to this workflow. Save the workflow again to bind it.',
  }),
  service_account_missing: i18n.translate('workflows.pageShare.blocker.accountMissing', {
    defaultMessage:
      'The service account in settings.run_as does not exist. Create it, or change settings.run_as and save the workflow.',
  }),
  service_account_disabled: i18n.translate('workflows.pageShare.blocker.accountDisabled', {
    defaultMessage:
      'The service account in settings.run_as is disabled. Enable it in Service accounts.',
  }),
  workflow_invalid: i18n.translate('workflows.pageShare.blocker.invalid', {
    defaultMessage: 'The saved workflow has errors. Fix them and save the workflow.',
  }),
  encryption_unavailable: i18n.translate('workflows.pageShare.blocker.encryption', {
    defaultMessage:
      'An administrator must set xpack.encryptedSavedObjects.encryptionKey before pages can be shared.',
  }),
};

/** Reasons that keep a published page offline until someone changes a setting elsewhere. */
const WARNING_TEXT: Partial<Record<WorkflowPageOfflineReason, string>> = {
  workflow_disabled: i18n.translate('workflows.pageShare.warning.workflowDisabled', {
    defaultMessage:
      'The workflow is disabled, so the page is offline. Enable it to accept submissions.',
  }),
  pages_disabled: i18n.translate('workflows.pageShare.warning.pagesDisabled', {
    defaultMessage:
      'An administrator turned off all workflow pages (Advanced settings, workflows:pages:enabled).',
  }),
};

const NO_MANAGE_PRIVILEGE = i18n.translate('workflows.pageShare.noManagePrivilege', {
  defaultMessage: 'You need the Manage pages privilege to change this page.',
});

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
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);

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
        setIsConfirmingRotate(false);
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
      defaultMessage="Anyone with the link can submit the form. Each submission runs the workflow as the service account {account}."
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
            defaultMessage: 'This page cannot run yet',
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
                defaultMessage="Publish the page to get its link."
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
          fullWidth
        >
          <EuiFieldText
            value={absoluteUrl}
            readOnly
            fullWidth
            onFocus={(event) => event.target.select()}
            data-test-subj="workflowPageShareUrl"
            append={
              <>
                <EuiCopy textToCopy={absoluteUrl}>
                  {(copy) => (
                    <EuiButtonEmpty
                      size="xs"
                      iconType="copy"
                      onClick={copy}
                      data-test-subj="workflowPageShareCopy"
                    >
                      {i18n.translate('workflows.pageShare.copy', { defaultMessage: 'Copy' })}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
                <EuiButtonEmpty
                  size="xs"
                  iconType="external"
                  href={absoluteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj="workflowPageShareOpen"
                >
                  {i18n.translate('workflows.pageShare.open', { defaultMessage: 'Open' })}
                </EuiButtonEmpty>
              </>
            }
          />
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
                  defaultMessage: 'The page is offline. The link stays the same.',
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
        <EuiHorizontalRule margin="l" />
        {isConfirmingRotate ? (
          <KbnWarningCallout
            title={i18n.translate('workflows.pageShare.rotateConfirmTitle', {
              defaultMessage: 'Create a new link?',
            })}
            text={i18n.translate('workflows.pageShare.rotateConfirmText', {
              defaultMessage:
                'The current link stops working at once. Anyone who has it can no longer open the page.',
            })}
            actionProps={{
              primary: {
                children: i18n.translate('workflows.pageShare.rotateConfirm', {
                  defaultMessage: 'Create new link',
                }),
                onClick: rotate,
                isLoading: pending === 'rotate',
                'data-test-subj': 'workflowPageShareRotateConfirm',
              },
              secondary: {
                children: i18n.translate('workflows.pageShare.rotateCancel', {
                  defaultMessage: 'Cancel',
                }),
                onClick: () => setIsConfirmingRotate(false),
              },
            }}
          />
        ) : (
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {withManageTooltip(
                <EuiButtonEmpty
                  size="s"
                  iconType="refresh"
                  onClick={() => setIsConfirmingRotate(true)}
                  isDisabled={!canManageWorkflowPages || pending !== undefined}
                  data-test-subj="workflowPageShareRotate"
                >
                  {i18n.translate('workflows.pageShare.rotate', {
                    defaultMessage: 'Create new link',
                  })}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {withManageTooltip(
                <EuiButtonEmpty
                  size="s"
                  color="danger"
                  onClick={() => setAccess(false)}
                  isLoading={pending === 'unpublish'}
                  isDisabled={!canManageWorkflowPages || pending !== undefined}
                  data-test-subj="workflowPageShareUnpublish"
                >
                  {i18n.translate('workflows.pageShare.unpublish', { defaultMessage: 'Unpublish' })}
                </EuiButtonEmpty>
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
