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
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import {
  getPageShareStatusView,
  isBlockingPageReason,
  PAGE_OFFLINE_REASON_TEXT,
  WORKFLOW_PAGE_API_VERSION,
  workflowPageApiPath,
  workflowPageQueryKey,
} from './page_share_model';
import type { WorkflowPageResponse } from '../../../../common/pages';
import { useKibana } from '../../../hooks/use_kibana';

const NO_MANAGE_PRIVILEGE = i18n.translate('workflows.pageShare.noManagePrivilege', {
  defaultMessage: 'You need the Manage pages privilege.',
});
const COPY_LINK = i18n.translate('workflows.pageShare.copyLink', { defaultMessage: 'Copy link' });
const OPEN_PAGE = i18n.translate('workflows.pageShare.openPage', { defaultMessage: 'Open page' });
const ROTATE_TITLE = i18n.translate('workflows.pageShare.rotate', {
  defaultMessage: 'Rotate link',
});
const ROTATE_DESCRIPTION = i18n.translate('workflows.pageShare.rotateDescription', {
  defaultMessage: 'Get a new link. The current one stops working at once.',
});
const ROTATE_BUTTON = i18n.translate('workflows.pageShare.rotateButton', {
  defaultMessage: 'Rotate',
});
const UNPUBLISH_TITLE = i18n.translate('workflows.pageShare.unpublishPage', {
  defaultMessage: 'Unpublish page',
});
const UNPUBLISH_DESCRIPTION = i18n.translate('workflows.pageShare.unpublishDescription', {
  defaultMessage: 'The link stops working. Publishing again brings back the same link.',
});
const UNPUBLISH = i18n.translate('workflows.pageShare.unpublish', { defaultMessage: 'Unpublish' });
const PUBLISH = i18n.translate('workflows.pageShare.publish', { defaultMessage: 'Publish page' });
const CANCEL = i18n.translate('workflows.pageShare.cancel', { defaultMessage: 'Cancel' });

const CONFIRM = {
  rotate: {
    title: i18n.translate('workflows.pageShare.rotateConfirmTitle', {
      defaultMessage: 'Rotate the link?',
    }),
    text: i18n.translate('workflows.pageShare.rotateConfirmText', {
      defaultMessage: 'The current link stops working. Share the new one again.',
    }),
    confirm: ROTATE_BUTTON,
    color: 'warning',
  },
  unpublish: {
    title: i18n.translate('workflows.pageShare.unpublishConfirmTitle', {
      defaultMessage: 'Unpublish the page?',
    }),
    text: i18n.translate('workflows.pageShare.unpublishConfirmText', {
      defaultMessage: 'Publishing again brings back the same link. Rotate it if it leaked.',
    }),
    confirm: UNPUBLISH,
    color: 'danger',
  },
} as const;

/** Title, explanation, and the action for one share-page row. */
const ShareActionRow = ({
  title,
  description,
  actions,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  description: string;
  actions: React.ReactNode;
  'data-test-subj'?: string;
}) => {
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      color="transparent"
      borderRadius="none"
      paddingSize="m"
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              <strong>{title}</strong>
            </p>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>{description}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{actions}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

type Action = 'publish' | 'unpublish' | 'enable' | 'disable' | 'rotate';

/** The button that opens each confirmation, where focus returns after it. */
const TRIGGER_TEST_SUBJ = {
  rotate: 'workflowPageShareRotate',
  unpublish: 'workflowPageShareUnpublish',
} as const;

/** The server's message for an HTTP error, so a 403 says which privilege is missing. */
const getErrorMessage = (error: unknown): string =>
  isHttpFetchError(error)
    ? (error.body as { message?: string } | undefined)?.message ?? error.message
    : error instanceof Error
    ? error.message
    : String(error);

/** The risk, naming the account submissions run as. */
const ExposureWarning = ({ serviceAccountId }: { serviceAccountId?: string }) => (
  <FormattedMessage
    id="workflows.pageShare.exposureWarning"
    defaultMessage="Anyone with this link can run this workflow as {account}. Treat the link as a password and rotate it if it leaks."
    values={{ account: <strong>{serviceAccountId}</strong> }}
  />
);

export interface WorkflowPageShareModalProps {
  workflowId: string;
  pageId: string;
  /** The `settings.run_as` of the saved workflow, so the author knows who submissions run as. */
  serviceAccountId?: string;
  onClose: () => void;
}

export const WorkflowPageShareModal = ({
  workflowId,
  pageId,
  serviceAccountId,
  onClose,
}: WorkflowPageShareModalProps) => {
  const { http, application, notifications } = useKibana().services;
  // Pages are behind a feature flag, so their privilege is not in the shared capabilities hook.
  const canManageWorkflowPages = Boolean(
    application.capabilities[WORKFLOWS_MANAGEMENT_FEATURE_ID]?.[
      WorkflowsManagementUiActions.managePages
    ]
  );
  const queryClient = useQueryClient();
  const titleId = useGeneratedHtmlId();
  const pagePath = (suffix = '') => workflowPageApiPath(workflowId, pageId, suffix);
  const queryKey = useMemo(() => workflowPageQueryKey(workflowId, pageId), [workflowId, pageId]);

  const [pending, setPending] = useState<Action>();
  const [actionError, setActionError] = useState<string>();
  const [confirming, setConfirming] = useState<'rotate' | 'unpublish'>();
  // The swapped content unmounts the focused button, so focus moves on explicitly.
  const [focusTarget, setFocusTarget] = useState<{ testSubj: string }>();

  const {
    data: page,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => http.get<WorkflowPageResponse>(pagePath(), WORKFLOW_PAGE_API_VERSION),
    refetchOnWindowFocus: false,
  });

  const run = useCallback(
    async (action: Action, request: () => Promise<unknown>) => {
      setPending(action);
      setActionError(undefined);
      try {
        await request();
        // Wait for the new link, so Copy and Open never hand out the revoked one.
        await queryClient.invalidateQueries({ queryKey });
        if (action === 'rotate') {
          notifications.toasts.addSuccess({
            title: i18n.translate('workflows.pageShare.rotatedToastTitle', {
              defaultMessage: 'Link rotated',
            }),
            text: i18n.translate('workflows.pageShare.rotatedToastText', {
              defaultMessage: 'Copy the new link. The previous one stopped working.',
            }),
          });
          setFocusTarget({ testSubj: 'workflowPageShareCopy' });
        }
      } catch (error) {
        setActionError(getErrorMessage(error));
        if (action === 'rotate' || action === 'unpublish') {
          setFocusTarget({ testSubj: TRIGGER_TEST_SUBJ[action] });
        }
      } finally {
        // Back to the share view, which shows the new state or the error.
        setConfirming(undefined);
        setPending(undefined);
      }
    },
    [notifications.toasts, queryClient, queryKey]
  );

  // Runs again on every view or pending change until the target is rendered and enabled:
  // this app renders without batching, so the target can appear a render later.
  useEffect(() => {
    if (!focusTarget) return;
    const target = document.querySelector<HTMLButtonElement>(
      `[data-test-subj="${focusTarget.testSubj}"]`
    );
    if (!target || target.disabled) return;
    target.focus();
    setFocusTarget(undefined);
  }, [focusTarget, confirming, pending, page]);

  const startConfirm = (kind: 'rotate' | 'unpublish') => {
    setConfirming(kind);
    setFocusTarget({ testSubj: 'workflowPageShareConfirmCancel' });
  };
  const cancelConfirm = () => {
    // While the change runs, the share view could still show the old link, so leave the modal.
    if (pending !== undefined) {
      onClose();
      return;
    }
    if (!confirming) return;
    setFocusTarget({ testSubj: TRIGGER_TEST_SUBJ[confirming] });
    setConfirming(undefined);
  };

  const setAccess = (published: boolean) =>
    run(published ? 'publish' : 'unpublish', () =>
      http.put(pagePath('/access'), {
        ...WORKFLOW_PAGE_API_VERSION,
        body: JSON.stringify({ access: published ? { level: 'secret_link' } : null }),
      })
    );
  const setEnabled = (enabled: boolean) =>
    run(enabled ? 'enable' : 'disable', () =>
      http.put(pagePath('/enabled'), {
        ...WORKFLOW_PAGE_API_VERSION,
        body: JSON.stringify({ enabled }),
      })
    );
  const rotate = () =>
    run('rotate', () => http.post(pagePath('/_rotate'), WORKFLOW_PAGE_API_VERSION));

  const reasons = page?.status.reasons ?? [];
  const blockers = reasons.filter(isBlockingPageReason);
  const submissionsPaused = reasons.includes('page_disabled');
  const offlineExplanations = reasons
    .filter(
      (reason) =>
        reason !== 'no_access_level' && reason !== 'page_disabled' && !isBlockingPageReason(reason)
    )
    .map((reason) => PAGE_OFFLINE_REASON_TEXT[reason]);
  // The link is for people outside Kibana, so prefer the public address over the browser's.
  const absoluteUrl = page?.url
    ? new URL(page.url, http.basePath.publicBaseUrl ?? window.location.origin).href
    : '';
  const status = page ? getPageShareStatusView(page, 'modal') : undefined;

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
    // A published page keeps its controls under the blockers, so a leaked link can be revoked.
    const blockersCallout = blockers.length > 0 && (
      <KbnDangerCallout
        title={i18n.translate('workflows.pageShare.blockedTitle', {
          defaultMessage: "This page can't run yet",
        })}
        data-test-subj="workflowPageShareBlockers"
        text={
          serviceAccountId && (
            <p>
              <FormattedMessage
                id="workflows.pageShare.configuredAccount"
                defaultMessage="settings.run_as is {account}."
                values={{ account: <EuiCode>{serviceAccountId}</EuiCode> }}
              />
            </p>
          )
        }
      >
        <ul>
          {blockers.map((reason) => (
            <li key={reason}>{PAGE_OFFLINE_REASON_TEXT[reason]}</li>
          ))}
        </ul>
      </KbnDangerCallout>
    );
    if (blockersCallout && page.access == null) {
      return blockersCallout;
    }
    if (page.access == null) {
      return (
        <>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="workflows.pageShare.notPublished"
                defaultMessage="Publish the page to get a link."
              />{' '}
              <ExposureWarning serviceAccountId={serviceAccountId} />
            </p>
          </EuiText>
        </>
      );
    }
    return (
      <>
        {blockersCallout || (
          <EuiText size="s">
            <p>
              <ExposureWarning serviceAccountId={serviceAccountId} />
            </p>
          </EuiText>
        )}
        <EuiSpacer size="m" />
        {absoluteUrl && (
          <>
            <EuiFormRow
              label={i18n.translate('workflows.pageShare.linkLabel', {
                defaultMessage: 'Page link',
              })}
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
            <EuiSpacer size="m" />
          </>
        )}
        {withManageTooltip(
          <EuiSwitch
            label={i18n.translate('workflows.pageShare.acceptSubmissions', {
              defaultMessage: 'Accept submissions',
            })}
            checked={page.enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={!canManageWorkflowPages || pending !== undefined}
            aria-describedby={submissionsPaused ? 'workflowPageSharePauseHelp' : undefined}
            data-test-subj="workflowPageShareEnabled"
          />
        )}
        {submissionsPaused && (
          <>
            <EuiSpacer size="s" />
            <EuiText
              id="workflowPageSharePauseHelp"
              size="s"
              color="subdued"
              data-test-subj="workflowPageSharePauseHelp"
            >
              <p>{PAGE_OFFLINE_REASON_TEXT.page_disabled}</p>
            </EuiText>
          </>
        )}
        {offlineExplanations.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <KbnWarningCallout
              title={i18n.translate('workflows.pageShare.offlineTitle', {
                defaultMessage: 'This page is offline',
              })}
              text={offlineExplanations.length === 1 ? offlineExplanations[0] : undefined}
              size="s"
              data-test-subj="workflowPageShareOfflineReasons"
            >
              {offlineExplanations.length > 1 ? (
                <ul>
                  {offlineExplanations.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </KbnWarningCallout>
          </>
        )}
        <EuiSpacer size="m" />
        <EuiPanel hasBorder hasShadow={false} paddingSize="none">
          {absoluteUrl && (
            <>
              <ShareActionRow
                title={ROTATE_TITLE}
                description={ROTATE_DESCRIPTION}
                actions={withManageTooltip(
                  <EuiButton
                    size="s"
                    color="text"
                    iconType="refresh"
                    onClick={() => startConfirm('rotate')}
                    isDisabled={!canManageWorkflowPages || pending !== undefined}
                    data-test-subj="workflowPageShareRotate"
                  >
                    {ROTATE_BUTTON}
                  </EuiButton>
                )}
              />
              <EuiHorizontalRule margin="none" />
            </>
          )}
          <ShareActionRow
            title={UNPUBLISH_TITLE}
            description={UNPUBLISH_DESCRIPTION}
            actions={withManageTooltip(
              <EuiButton
                size="s"
                color="danger"
                iconType="linkSlash"
                onClick={() => startConfirm('unpublish')}
                isDisabled={!canManageWorkflowPages || pending !== undefined}
                data-test-subj="workflowPageShareUnpublish"
              >
                {UNPUBLISH}
              </EuiButton>
            )}
          />
        </EuiPanel>
      </>
    );
  };

  const statusBadge = status && (
    <EuiBadge color={status.color} data-test-subj="workflowPageShareStatus">
      {status.label}
    </EuiBadge>
  );

  // The confirmation replaces the modal's content, not the modal, so the overlay does not blink.
  if (confirming) {
    const { title, text, confirm, color } = CONFIRM[confirming];
    return (
      <EuiModal
        onClose={cancelConfirm}
        aria-labelledby={titleId}
        maxWidth={560}
        data-test-subj={`workflowPageShareConfirm-${confirming}`}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="s">
            <p>{text}</p>
          </EuiText>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={cancelConfirm}
            isDisabled={pending !== undefined}
            data-test-subj="workflowPageShareConfirmCancel"
          >
            {CANCEL}
          </EuiButtonEmpty>
          <EuiButton
            fill
            color={color}
            onClick={confirming === 'rotate' ? rotate : () => setAccess(false)}
            isLoading={pending !== undefined}
            data-test-subj="workflowPageShareConfirm"
          >
            {confirm}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }

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
        {page && page.access == null && blockers.length === 0 ? (
          <>
            <EuiButtonEmpty onClick={onClose} data-test-subj="workflowPageShareCancel">
              {CANCEL}
            </EuiButtonEmpty>
            {withManageTooltip(
              <EuiButton
                fill
                onClick={() => setAccess(true)}
                isLoading={pending === 'publish'}
                isDisabled={!canManageWorkflowPages || pending !== undefined}
                data-test-subj="workflowPageSharePublish"
              >
                {PUBLISH}
              </EuiButton>
            )}
          </>
        ) : (
          <EuiButton onClick={onClose} data-test-subj="workflowPageShareDone">
            {i18n.translate('workflows.pageShare.done', { defaultMessage: 'Done' })}
          </EuiButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
