/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MissingDashboard, RuleArtifactPayload } from '@kbn/alerting-v2-rule-form';
import { mapArtifacts } from '@kbn/alerting-v2-rule-form';
import { useUpdateRule } from '../../../../hooks/use_update_rule';
import { UserCapabilities } from '../../../../services/user_capabilities';
import { useRule } from '../../rule_context';
import { ManageDashboardsPopover } from './manage_dashboards_popover';
import { useDashboardArtifacts } from './use_dashboard_artifacts';

/** Stable empty list so ManageDashboardsPopover does not re-init on every parent render. */
const EMPTY_ARTIFACTS: RuleArtifactPayload = [];

const getDashboardHref = ({
  dashboardId,
  share,
  httpBasePathPrepend,
}: {
  dashboardId: string;
  share: SharePluginStart;
  httpBasePathPrepend: (path: string) => string;
}) =>
  share.url.locators.get(DASHBOARD_APP_LOCATOR)?.getRedirectUrl({ dashboardId }) ??
  httpBasePathPrepend(`/app/dashboards#/view/${dashboardId}`);

interface DashboardRowActionsProps {
  dashboardId: string;
  dashboardTitle: string;
  href?: string;
  artifactId: string | undefined;
  isUpdating: boolean;
  canWrite: boolean;
  onDelete: (artifactId: string) => void;
}

const DashboardRowActions = ({
  dashboardId,
  dashboardTitle,
  href,
  artifactId,
  isUpdating,
  canWrite,
  onDelete,
}: DashboardRowActionsProps) => {
  const openLabel = i18n.translate(
    'xpack.alertingV2.ruleDetails.artifacts.dashboards.openDashboardAriaLabel',
    { defaultMessage: 'Open dashboard {dashboardTitle}', values: { dashboardTitle } }
  );
  const removeLabel = i18n.translate(
    'xpack.alertingV2.ruleDetails.artifacts.dashboards.deleteAriaLabel',
    { defaultMessage: 'Remove dashboard {dashboardTitle}', values: { dashboardTitle } }
  );
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      {href ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={openLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="external"
              color="text"
              href={href}
              target="_blank"
              aria-label={openLabel}
              data-test-subj={`ruleDashboardArtifactOpenLink-${dashboardId}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
      {canWrite && artifactId ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={removeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={removeLabel}
              data-test-subj={`ruleDashboardArtifactDeleteButton-${dashboardId}`}
              isDisabled={isUpdating}
              onClick={() => onDelete(artifactId)}
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

const ResolvedDashboardRow = ({
  dashboardId,
  title,
  href,
  artifactId,
  isUpdating,
  canWrite,
  onDelete,
}: {
  dashboardId: string;
  title: string;
  href: string;
  artifactId: string | undefined;
  isUpdating: boolean;
  canWrite: boolean;
  onDelete: (artifactId: string) => void;
}) => (
  <EuiPanel hasBorder paddingSize="s" data-test-subj={`ruleDashboardArtifactRow-${dashboardId}`}>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow>
        <EuiText size="s" data-test-subj={`ruleDashboardArtifactTitle-${dashboardId}`}>
          {title}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DashboardRowActions
          dashboardId={dashboardId}
          dashboardTitle={title}
          href={href}
          artifactId={artifactId}
          isUpdating={isUpdating}
          canWrite={canWrite}
          onDelete={onDelete}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const MissingDashboardRow = ({
  missingDashboard,
  artifactId,
  isUpdating,
  canWrite,
  onDelete,
}: {
  missingDashboard: MissingDashboard;
  artifactId: string | undefined;
  isUpdating: boolean;
  canWrite: boolean;
  onDelete: (artifactId: string) => void;
}) => {
  const missingTitle = missingDashboard.notFound
    ? i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.deletedBadge', {
        defaultMessage: 'Dashboard deleted',
      })
    : i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.unavailableBadge', {
        defaultMessage: 'Dashboard unavailable',
      });

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      data-test-subj={`ruleDashboardArtifactMissingRow-${missingDashboard.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning" iconType="warning">
            {missingTitle}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.ruleDetails.artifacts.dashboards.missingDashboardLabel"
              defaultMessage="Unknown dashboard"
            />{' '}
            <EuiCode>{missingDashboard.id}</EuiCode>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DashboardRowActions
            dashboardId={missingDashboard.id}
            dashboardTitle={missingTitle}
            artifactId={artifactId}
            isUpdating={isUpdating}
            canWrite={canWrite}
            onDelete={onDelete}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const DashboardsSubsectionHeader = ({ manageButton }: { manageButton: React.ReactNode }) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="dashboardApp" size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.title', {
                defaultMessage: 'Dashboards',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    {manageButton ? <EuiFlexItem grow={false}>{manageButton}</EuiFlexItem> : null}
  </EuiFlexGroup>
);

export const DashboardArtifactsSubsection: React.FC = () => {
  const rule = useRule();
  const canWrite = useService(UserCapabilities).canWrite('rules');
  const http = useService(CoreStart('http'));
  const share = useService(PluginStart('share')) as SharePluginStart;
  const dashboard = useService(PluginStart('dashboard'), { optional: true }) as
    | DashboardStart
    | undefined;
  const { mutate: updateRule, isLoading: isUpdating } = useUpdateRule();
  const { dashboardArtifacts, resolved, missing, isLoading, isError, artifactIdByDashboardId } =
    useDashboardArtifacts(rule.artifacts, dashboard);

  const [artifactIdPendingDelete, setArtifactIdPendingDelete] = useState<string | null>(null);
  const [isManagePopoverOpen, setIsManagePopoverOpen] = useState(false);
  const confirmModalTitleId = useGeneratedHtmlId();

  const canManage = Boolean(dashboard) && canWrite;

  const openManagePopover = useCallback(() => {
    setIsManagePopoverOpen(true);
  }, []);

  const toggleManagePopover = useCallback(() => {
    setIsManagePopoverOpen((isOpen) => !isOpen);
  }, []);

  const closeManagePopover = useCallback(() => {
    setIsManagePopoverOpen(false);
  }, []);

  const handleDeleteRequest = useCallback((artifactId: string) => {
    setArtifactIdPendingDelete(artifactId);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setArtifactIdPendingDelete(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!artifactIdPendingDelete) {
      return;
    }

    updateRule(
      {
        id: rule.id,
        payload: {
          artifacts:
            mapArtifacts(
              (rule.artifacts ?? []).filter((artifact) => artifact.id !== artifactIdPendingDelete)
            ) ?? [],
        },
      },
      {
        onSettled: () => {
          setArtifactIdPendingDelete(null);
        },
      }
    );
  }, [artifactIdPendingDelete, rule.artifacts, rule.id, updateRule]);

  const handleManageSave = useCallback(
    (artifacts: RuleArtifactPayload) => {
      updateRule(
        {
          id: rule.id,
          payload: { artifacts },
        },
        {
          onSuccess: () => {
            setIsManagePopoverOpen(false);
          },
        }
      );
    },
    [rule.id, updateRule]
  );

  const dashboardLinks = useMemo(
    () =>
      resolved.map((entry) => ({
        ...entry,
        href: getDashboardHref({
          dashboardId: entry.id,
          share,
          httpBasePathPrepend: http.basePath.prepend.bind(http.basePath),
        }),
      })),
    [http.basePath, resolved, share]
  );

  const hasDashboardArtifacts = dashboardArtifacts.length > 0;

  const manageButtonLabel = i18n.translate(
    'xpack.alertingV2.ruleDetails.artifacts.dashboards.manageAriaLabel',
    { defaultMessage: 'Attach related dashboards' }
  );

  const manageControl =
    canManage && dashboard ? (
      <ManageDashboardsPopover
        isOpen={isManagePopoverOpen}
        onClose={closeManagePopover}
        button={
          <EuiToolTip content={manageButtonLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="plusCircle"
              color="text"
              aria-label={manageButtonLabel}
              data-test-subj="ruleDashboardArtifactsAddButton"
              onClick={toggleManagePopover}
            />
          </EuiToolTip>
        }
        dashboard={dashboard}
        existingArtifacts={rule.artifacts ?? EMPTY_ARTIFACTS}
        isSaving={isUpdating}
        onSave={handleManageSave}
      />
    ) : null;

  return (
    <>
      <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleDashboardArtifactsSection">
        <DashboardsSubsectionHeader manageButton={manageControl} />
        <EuiSpacer size="m" />

        {!dashboard ? (
          <EuiText size="s" color="subdued" data-test-subj="ruleDashboardArtifactsUnavailable">
            {i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.dashboards.unavailableService',
              {
                defaultMessage: 'Dashboards are unavailable in this environment.',
              }
            )}
          </EuiText>
        ) : null}

        {dashboard && isLoading ? (
          <EuiLoadingSpinner size="m" data-test-subj="ruleDashboardArtifactsLoading" />
        ) : null}

        {dashboard && !isLoading && isError ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            data-test-subj="ruleDashboardArtifactsError"
            title={
              <h4>
                {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.errorTitle', {
                  defaultMessage: 'Could not load dashboards',
                })}
              </h4>
            }
            body={
              <EuiText size="s">
                {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.errorBody', {
                  defaultMessage: 'Try refreshing the page.',
                })}
              </EuiText>
            }
          />
        ) : null}

        {dashboard && !isLoading && !isError && !hasDashboardArtifacts ? (
          <EuiEmptyPrompt
            iconType="dashboardApp"
            data-test-subj="ruleDashboardArtifactsEmpty"
            title={
              <h4>
                {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.emptyTitle', {
                  defaultMessage: 'No dashboards linked',
                })}
              </h4>
            }
            body={
              <EuiText size="s">
                {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.emptyBody', {
                  defaultMessage: 'Link investigation dashboards to this rule.',
                })}
              </EuiText>
            }
            actions={
              canManage ? (
                <EuiButton
                  size="s"
                  onClick={openManagePopover}
                  data-test-subj="ruleDashboardArtifactsEmptyAddButton"
                >
                  {i18n.translate(
                    'xpack.alertingV2.ruleDetails.artifacts.dashboards.emptyAddButton',
                    { defaultMessage: 'Add dashboards' }
                  )}
                </EuiButton>
              ) : undefined
            }
          />
        ) : null}

        {dashboard && !isLoading && !isError && hasDashboardArtifacts ? (
          <>
            {dashboardLinks.map((entry) => (
              <React.Fragment key={entry.id}>
                <ResolvedDashboardRow
                  dashboardId={entry.id}
                  title={entry.title}
                  href={entry.href}
                  artifactId={artifactIdByDashboardId.get(entry.id)}
                  isUpdating={isUpdating}
                  canWrite={canWrite}
                  onDelete={handleDeleteRequest}
                />
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
            {missing.map((missingDashboard) => (
              <React.Fragment key={missingDashboard.id}>
                <MissingDashboardRow
                  missingDashboard={missingDashboard}
                  artifactId={artifactIdByDashboardId.get(missingDashboard.id)}
                  isUpdating={isUpdating}
                  canWrite={canWrite}
                  onDelete={handleDeleteRequest}
                />
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
          </>
        ) : null}
      </EuiPanel>

      {artifactIdPendingDelete ? (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          titleProps={{ id: confirmModalTitleId }}
          title={i18n.translate(
            'xpack.alertingV2.ruleDetails.artifacts.dashboards.deleteConfirmTitle',
            { defaultMessage: 'Remove linked dashboard' }
          )}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          cancelButtonText={i18n.translate(
            'xpack.alertingV2.ruleDetails.artifacts.dashboards.deleteConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.alertingV2.ruleDetails.artifacts.dashboards.deleteConfirmConfirm',
            { defaultMessage: 'Remove' }
          )}
          buttonColor="danger"
          isLoading={isUpdating}
          data-test-subj="ruleDashboardArtifactDeleteConfirmModal"
        >
          {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.deleteConfirmBody', {
            defaultMessage:
              'Remove this dashboard from the rule? You can re-attach it from this widget.',
          })}
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
