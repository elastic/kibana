/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiHealth, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { RuleExecutionOutcome } from '@kbn/alerting-v2-schemas';
import { useRuleAutoAttach } from '@kbn/alerting-v2-browser-shared';
import { RULE_KIND_ICONS, RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useAlertingLocators } from '../../../../application/locator_context';
import { useFetchRuleExecutions } from '../../../../hooks/use_fetch_rule_executions';
import { useRuleAuditMetadata } from '../../../../hooks/use_rule_audit_metadata';
import { RuleActionsMenu } from '../../../../pages/rules_list_page/rule_actions_menu';
import type { RuleApiResponse } from '../../../../services/rules_api';
import { UserCapabilities } from '../../../../services/user_capabilities';
import { EMPTY_VALUE } from '../../../../utils/rule_display';
import {
  RuleSummaryAboutSection,
  RuleSummaryActionPoliciesSection,
  RuleSummaryArtifactsSection,
  RuleSummaryBody,
  RuleSummaryInvestigationSection,
} from '../../rule_summary';

const TAKE_ACTION_BUTTON_ID = 'ruleSummaryFlyoutTakeAction';

const LAST_EXECUTION_OUTCOME_LABELS: Record<RuleExecutionOutcome, string> = {
  success: i18n.translate('xpack.alertingV2.ruleSummaryFlyout.lastExecution.success', {
    defaultMessage: 'Succeeded',
  }),
  failure: i18n.translate('xpack.alertingV2.ruleSummaryFlyout.lastExecution.failure', {
    defaultMessage: 'Failed',
  }),
};

export interface RuleSummaryFlyoutProps {
  rule: RuleApiResponse;
  onClose: () => void;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled: (rule: RuleApiResponse) => void;
  onRun: (rule: RuleApiResponse) => void;
  onUpdateApiKey?: (rule: RuleApiResponse) => void;
  onViewChangeHistory?: (rule: RuleApiResponse) => void;
  canWrite?: boolean;
  isToggleLoading?: boolean;
  session?: EuiFlyoutProps['session'];
}

export const RuleSummaryFlyout = ({
  rule,
  onClose,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
  onRun,
  onUpdateApiKey,
  onViewChangeHistory,
  canWrite = true,
  isToggleLoading = false,
  session,
}: RuleSummaryFlyoutProps) => {
  const chrome = useService(CoreStart('chrome'));
  const agentBuilder = useService(PluginStart('agentBuilder'), { optional: true }) as
    | AgentBuilderPluginStart
    | undefined;
  const { rulesLocators } = useAlertingLocators();
  useRuleAutoAttach(rule, { chrome, agentBuilder });
  const { createdByDisplay, updatedByDisplay, updatedAtFormatted } = useRuleAuditMetadata(rule);
  const canReadExecutionHistory = useService(UserCapabilities).canRead('executionHistory');
  const {
    data: executionsData,
    isLoading: isLoadingLastExecution,
    isError: isErrorLastExecution,
  } = useFetchRuleExecutions({
    ruleIds: [rule.id],
    perPage: 1,
    sort: 'startedAt',
    sortOrder: 'desc',
    enabled: canReadExecutionHistory,
  });
  const lastExecution = executionsData?.items[0];
  const [isTakeActionOpen, setIsTakeActionOpen] = useState(false);
  const detailsHref = rulesLocators.useUrl({ ruleId: rule.id }, undefined, [rule.id]);

  const kindLabel = RULE_KIND_LABELS[rule.kind] ?? rule.kind;
  const enabledLabel = rule.enabled
    ? i18n.translate('xpack.alertingV2.ruleSummaryFlyout.enabled', {
        defaultMessage: 'Enabled',
      })
    : i18n.translate('xpack.alertingV2.ruleSummaryFlyout.disabled', {
        defaultMessage: 'Disabled',
      });

  const { Header, Body, Footer } = FlyoutTemplate;
  const { Badge, InfoBlock } = Header;

  const renderLastExecutionValue = (): React.ReactNode => {
    if (isLoadingLastExecution) {
      return <EuiLoadingSpinner data-test-subj="ruleSummaryFlyoutLastExecutionSpinner" size="m" />;
    }
    if (isErrorLastExecution) {
      return (
        <EuiHealth color="subdued" data-test-subj="ruleSummaryFlyoutLastExecutionError">
          {i18n.translate('xpack.alertingV2.ruleSummaryFlyout.lastExecution.unavailable', {
            defaultMessage: 'Unavailable',
          })}
        </EuiHealth>
      );
    }
    if (lastExecution) {
      return (
        <EuiHealth
          color={lastExecution.outcome === 'success' ? 'success' : 'danger'}
          data-test-subj="ruleSummaryFlyoutLastExecutionStatus"
        >
          {LAST_EXECUTION_OUTCOME_LABELS[lastExecution.outcome]}
        </EuiHealth>
      );
    }
    return EMPTY_VALUE;
  };

  return (
    <>
      <FlyoutTemplate
        type="overlay"
        size="m"
        resizable
        session={session}
        onClose={onClose}
        data-test-subj="ruleSummaryFlyout"
      >
        <Header title={rule.metadata.name} description={updatedAtFormatted}>
          <Badge
            color="hollow"
            iconType={RULE_KIND_ICONS[rule.kind] ?? 'dot'}
            data-test-subj="kindBadge"
          >
            {kindLabel}
          </Badge>
          <Badge
            color={rule.enabled ? 'success' : 'default'}
            data-test-subj={rule.enabled ? 'enabledBadge' : 'disabledBadge'}
          >
            {enabledLabel}
          </Badge>
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.enabled', {
              defaultMessage: 'Enabled',
            })}
            data-test-subj="ruleSummaryFlyoutEnabledBlock"
          >
            {isToggleLoading ? (
              <EuiLoadingSpinner data-test-subj="ruleSummaryFlyoutEnabledSpinner" size="m" />
            ) : (
              <EuiSwitch
                compressed
                checked={rule.enabled}
                disabled={!canWrite}
                showLabel={false}
                label={enabledLabel}
                onChange={() => onToggleEnabled(rule)}
                data-test-subj="ruleSummaryFlyoutEnabledSwitch"
              />
            )}
          </InfoBlock>
          {canReadExecutionHistory && (
            <InfoBlock
              title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.lastExecution', {
                defaultMessage: 'Last execution',
              })}
              data-test-subj="ruleSummaryFlyoutLastExecutionBlock"
            >
              {renderLastExecutionValue()}
            </InfoBlock>
          )}
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.createdBy', {
              defaultMessage: 'Created by',
            })}
            data-test-subj="ruleSummaryFlyoutCreatedByBlock"
          >
            {createdByDisplay}
          </InfoBlock>
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.updatedBy', {
              defaultMessage: 'Updated by',
            })}
            data-test-subj="ruleSummaryFlyoutUpdatedByBlock"
          >
            {updatedByDisplay}
          </InfoBlock>
        </Header>

        <Body>
          <RuleSummaryBody rule={rule}>
            <RuleSummaryAboutSection />
            <RuleSummaryInvestigationSection />
            <RuleSummaryActionPoliciesSection />
            <RuleSummaryArtifactsSection />
          </RuleSummaryBody>
        </Body>

        <Footer>
          <Footer.PrimaryAction
            id={TAKE_ACTION_BUTTON_ID}
            label={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.takeAction', {
              defaultMessage: 'Take action',
            })}
            iconType={isTakeActionOpen ? 'chevronSingleUp' : 'chevronSingleDown'}
            onClick={() => setIsTakeActionOpen((open) => !open)}
            data-test-subj="ruleSummaryFlyoutTakeActionButton"
          />
        </Footer>
      </FlyoutTemplate>
      <RuleActionsMenu
        rule={rule}
        canWrite={canWrite}
        detailsHref={detailsHref}
        anchorPosition="upRight"
        anchorId={TAKE_ACTION_BUTTON_ID}
        isOpen={isTakeActionOpen}
        onOpenChange={setIsTakeActionOpen}
        onEdit={onEdit}
        onClone={onClone}
        onDelete={onDelete}
        onToggleEnabled={onToggleEnabled}
        onRun={onRun}
        onUpdateApiKey={onUpdateApiKey}
        onViewChangeHistory={onViewChangeHistory}
      />
    </>
  );
};
