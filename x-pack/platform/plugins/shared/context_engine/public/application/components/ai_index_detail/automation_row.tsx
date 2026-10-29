/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { FormattedRelative } from '@kbn/i18n-react';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import { RunWorkflowInputsModal, requiresUserSuppliedInputs } from '@kbn/workflows-ui';
import React, { useCallback, useMemo, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { AiIndexAutomation } from '../../../../common/http_api/ai_indices';
import { useAutomationRowMenuItems } from '../../hooks/use_automation_row_menu_items';
import { useKibana } from '../../hooks/use_kibana';
import { useLatestWorkflowExecution } from '../../hooks/use_latest_workflow_execution';
import { useRunAutomation } from '../../hooks/use_run_automation';
import { getWorkflowExecutionPath } from '../../utils/get_workflow_execution_path';
import type { WorkflowSummary } from '../../hooks/use_workflow_summaries';
import { ItemRow } from '../item_row';
import { ItemRowIcon } from '../item_row_icon';
import { AutomationConfigureFlyout } from './automation_configure_flyout';
import { AutomationDeleteConfirmModal } from './automation_delete_confirm_modal';
import { WorkflowYamlPreviewFlyout } from './workflow_yaml_preview_flyout';

const runLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.automations.runAction', {
  defaultMessage: 'Run',
});
const runningLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.automations.running', {
  defaultMessage: 'Running. Open the execution.',
});
const configureLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.automations.configureAction',
  { defaultMessage: 'Configure' }
);

/** The icon a finished run is shown with; a running one already shows the spinner. */
const statusIcon = (
  status: ExecutionStatus
): { type: string; color: 'success' | 'danger' | 'subdued'; label: string } | undefined => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return {
        type: 'checkCircleFill',
        color: 'success',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.completed', {
          defaultMessage: 'Succeeded',
        }),
      };
    case ExecutionStatus.FAILED:
      return {
        type: 'errorFill',
        color: 'danger',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.failed', {
          defaultMessage: 'Failed',
        }),
      };
    case ExecutionStatus.TIMED_OUT:
      return {
        type: 'errorFill',
        color: 'danger',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.timedOut', {
          defaultMessage: 'Timed out',
        }),
      };
    case ExecutionStatus.CANCELLED:
      return {
        type: 'minusCircle',
        color: 'subdued',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.cancelled', {
          defaultMessage: 'Cancelled',
        }),
      };
    case ExecutionStatus.SKIPPED:
      return {
        type: 'minusCircle',
        color: 'subdued',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.skipped', {
          defaultMessage: 'Skipped',
        }),
      };
    default:
      return undefined;
  }
};

/** When the workflow last ran and how it ended, linking to that execution. */
const LastExecution = ({
  execution,
  href,
}: {
  execution: WorkflowExecutionListItemDto | null;
  href?: string;
}) => {
  if (!execution) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="contextAutomationLastExecution">
        {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.neverRun', {
          defaultMessage: 'Never run',
        })}
      </EuiText>
    );
  }
  const time = <FormattedRelative value={new Date(execution.startedAt)} />;
  const icon = statusIcon(execution.status);
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      data-test-subj="contextAutomationLastExecution"
    >
      {icon ? (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type={icon.type}
            color={icon.color}
            size="s"
            content={icon.label}
            aria-label={icon.label}
            iconProps={{
              'data-test-subj': `contextAutomationLastExecutionStatus-${execution.status}`,
            }}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" className="eui-textTruncate">
          {href ? (
            <EuiLink href={href} color="text">
              {time}
            </EuiLink>
          ) : (
            time
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface AutomationRowProps {
  automation: AiIndexAutomation;
  workflowSummary?: WorkflowSummary;
  editHref: string;
  isReadOnly: boolean;
  isBusy: boolean;
  canRun: boolean;
  onDelete: () => Promise<boolean>;
}

export const AutomationRow = ({
  automation,
  workflowSummary,
  editHref,
  isReadOnly,
  isBusy,
  canRun,
  onDelete,
}: AutomationRowProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInputsModalOpen, setIsInputsModalOpen] = useState(false);
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const { runAutomation, isLoading } = useRunAutomation();
  const {
    services: { application },
  } = useKibana();
  const displayName = workflowSummary?.name ?? automation.value;
  const enabled = workflowSummary?.enabled;
  const definition = workflowSummary?.definition;
  const hasWorkflowDefinition = definition != null;
  const latest = useLatestWorkflowExecution(automation.value, { enabled: hasWorkflowDefinition });
  const isRunning = isLoading || latest.isRunning;
  const latestExecutionHref = latest.execution
    ? application.getUrlForApp(WORKFLOWS_APP_ID, {
        path: getWorkflowExecutionPath(automation.value, latest.execution.id),
      })
    : undefined;
  const actionsAriaLabel = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.automations.actionsAriaLabel',
    { defaultMessage: 'Actions for {name}', values: { name: displayName } }
  );

  const normalizedInputs = useMemo(() => getInputsFromDefinition(definition), [definition]);
  const needsManualInputs = useMemo(
    () => requiresUserSuppliedInputs(normalizedInputs),
    [normalizedInputs]
  );

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const openPreview = useCallback(() => setIsPreviewOpen(true), []);
  const openDeleteModal = useCallback(() => setIsDeleteModalOpen(true), []);
  const openConfigure = useCallback(() => setIsConfigureOpen(true), []);

  const handleRun = useCallback(() => {
    if (!hasWorkflowDefinition) {
      return;
    }
    if (needsManualInputs) {
      setIsInputsModalOpen(true);
    } else {
      runAutomation(automation.value);
    }
  }, [automation.value, hasWorkflowDefinition, needsManualInputs, runAutomation]);

  const menuItems = useAutomationRowMenuItems({
    editHref,
    isReadOnly,
    isBusy,
    onCloseMenu: closeMenu,
    onPreview: openPreview,
    onDelete: openDeleteModal,
  });
  const isRunDisabled = isBusy || enabled === false || !hasWorkflowDefinition;

  return (
    <>
      <ItemRow
        label={displayName}
        icon={<ItemRowIcon iconType="workflow" />}
        actions={
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {canRun ? (
              <EuiFlexItem grow={false}>
                {isRunning ? (
                  <EuiToolTip content={runningLabel} disableScreenReaderOutput>
                    {latestExecutionHref && latest.isRunning ? (
                      <EuiLink
                        href={latestExecutionHref}
                        aria-label={runningLabel}
                        data-test-subj="contextAutomationRunning"
                      >
                        <EuiLoadingSpinner size="m" />
                      </EuiLink>
                    ) : (
                      <EuiLoadingSpinner
                        size="m"
                        aria-label={runningLabel}
                        data-test-subj="contextAutomationRunning"
                      />
                    )}
                  </EuiToolTip>
                ) : (
                  <EuiToolTip content={runLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="play"
                      color="text"
                      aria-label={runLabel}
                      isDisabled={isRunDisabled}
                      onClick={handleRun}
                      data-test-subj="contextRunAutomationButton"
                      {...getEbtProps({
                        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
                        action: CONTEXT_ENGINE_UI_EBT.action.automations.RUN_WORKFLOW,
                      })}
                    />
                  </EuiToolTip>
                )}
              </EuiFlexItem>
            ) : null}
            {/* Configuring changes the workflow, not the AI index, so managed indices offer it. */}
            {hasWorkflowDefinition ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={configureLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="gear"
                    color="text"
                    aria-label={configureLabel}
                    onClick={openConfigure}
                    data-test-subj="contextConfigureAutomationButton"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiPopover
                panelPaddingSize="none"
                anchorPosition="downRight"
                isOpen={isMenuOpen}
                closePopover={() => setIsMenuOpen(false)}
                aria-label={actionsAriaLabel}
                button={
                  <EuiToolTip content={actionsAriaLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="ellipsis"
                      color="text"
                      aria-label={actionsAriaLabel}
                      onClick={() => setIsMenuOpen((open) => !open)}
                      data-test-subj="contextAutomationRowActionsButton"
                      {...getEbtProps({
                        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
                        action: CONTEXT_ENGINE_UI_EBT.action.automations.ROW_ACTIONS_MENU,
                      })}
                    />
                  </EuiToolTip>
                }
              >
                <EuiContextMenuPanel items={menuItems} />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        data-test-subj="contextAiIndexAutomationRow"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
            <EuiText size="s" className="eui-textTruncate">
              <strong>{displayName}</strong>
            </EuiText>
          </EuiFlexItem>
          {enabled !== undefined ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color={enabled ? 'success' : 'hollow'}>
                {enabled
                  ? i18n.translate('xpack.contextEngine.aiIndexDetail.automations.enabledBadge', {
                      defaultMessage: 'Enabled',
                    })
                  : i18n.translate('xpack.contextEngine.aiIndexDetail.automations.disabledBadge', {
                      defaultMessage: 'Disabled',
                    })}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {hasWorkflowDefinition && latest.execution !== undefined ? (
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <LastExecution execution={latest.execution} href={latestExecutionHref} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </ItemRow>
      {isPreviewOpen ? (
        <WorkflowYamlPreviewFlyout
          workflowId={automation.value}
          workflowName={displayName}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
      {isConfigureOpen ? (
        <AutomationConfigureFlyout
          workflowId={automation.value}
          workflowName={displayName}
          editHref={editHref}
          onClose={() => setIsConfigureOpen(false)}
        />
      ) : null}
      {isDeleteModalOpen ? (
        <AutomationDeleteConfirmModal
          name={displayName}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={async () => {
            const saved = await onDelete();
            if (saved) {
              setIsDeleteModalOpen(false);
            }
          }}
        />
      ) : null}
      {isInputsModalOpen && normalizedInputs ? (
        <RunWorkflowInputsModal
          workflowName={displayName}
          inputs={normalizedInputs}
          onSubmit={(values) => {
            setIsInputsModalOpen(false);
            runAutomation(automation.value, values);
          }}
          onCancel={() => setIsInputsModalOpen(false)}
        />
      ) : null}
    </>
  );
};
