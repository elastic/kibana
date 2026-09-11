/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';
import { RULE_KIND_ICONS, RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FlyoutAccordion, FlyoutSubsection } from '@kbn/flyout-sections';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useRuleAutoAttach } from '../../../../agent_builder/use_rule_auto_attach';
import { paths } from '../../../../constants';
import { useRuleAuditMetadata } from '../../../../hooks/use_rule_audit_metadata';
import { RuleActionsMenu } from '../../../../pages/rules_list_page/rule_actions_menu';
import type { RuleApiResponse } from '../../../../services/rules_api';
import { UserCapabilities } from '../../../../services/user_capabilities';
import { RuleProvider } from '../../../rule_details/rule_context';
import { DashboardArtifactsSubsection } from '../../../rule_details/overview/artifacts/dashboard_artifacts_subsection';
import { ActionPoliciesArtifactsSubsection } from '../../../rule_details/overview/artifacts/action_policies_artifacts_subsection';
import { RuleConditions } from '../../../rule_details/sidebar/rule_conditions';
import { EMPTY_VALUE } from '../../../rule_details/utils';
import { RuleSummaryAboutCard } from './rule_summary_about_card';
import { RuleSummaryRunbookCard } from './rule_summary_runbook_card';

const TAKE_ACTION_BUTTON_ID = 'ruleSummaryFlyoutTakeAction';

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
  type?: EuiFlyoutProps['type'];
  session?: EuiFlyoutProps['session'];
  ownFocus?: EuiFlyoutProps['ownFocus'];
  /** Kept for callers; FlyoutTemplate does not forward EUI flyout animation. */
  hasAnimation?: boolean;
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
  type = 'push',
  session,
  ownFocus = true,
}: RuleSummaryFlyoutProps) => {
  const { basePath } = useService(CoreStart('http'));
  const canReadActionPolicies = useService(UserCapabilities).canRead('actionPolicies');
  useRuleAutoAttach(rule);
  const { createdByDisplay, updatedByDisplay, updatedAtFormatted } = useRuleAuditMetadata(rule);
  const [isTakeActionOpen, setIsTakeActionOpen] = useState(false);
  const detailsHref = basePath.prepend(paths.ruleDetails(rule.id));

  const hasRunbook = Boolean(rule.artifacts?.some((artifact) => artifact.type === 'runbook'));
  const hasDashboards = Boolean(rule.artifacts?.some((artifact) => artifact.type === 'dashboard'));
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

  return (
    <RuleProvider rule={rule}>
      <FlyoutTemplate
        type={type}
        size="s"
        ownFocus={ownFocus}
        session={session}
        onClose={onClose}
        data-test-subj="ruleSummaryFlyout"
        closeButtonProps={{ 'data-test-subj': 'ruleSummaryFlyoutCloseButton' }}
      >
        <Header
          title={rule.metadata.name}
          description={updatedAtFormatted}
          data-test-subj="ruleSummaryFlyoutTitle"
        >
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
            <EuiSwitch
              compressed
              checked={rule.enabled}
              disabled={!canWrite}
              showLabel={false}
              label={enabledLabel}
              onChange={() => onToggleEnabled(rule)}
              data-test-subj="ruleSummaryFlyoutEnabledSwitch"
            />
          </InfoBlock>
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.lastExecution', {
              defaultMessage: 'Last execution',
            })}
            data-test-subj="ruleSummaryFlyoutLastExecutionBlock"
          >
            {EMPTY_VALUE}
          </InfoBlock>
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
          <FlyoutAccordion
            title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.about', {
              defaultMessage: 'About',
            })}
            hasBorder={false}
            initialIsOpen
            data-test-subj="ruleSummaryFlyoutAbout"
          >
            <RuleSummaryAboutCard />
            <EuiSpacer size="m" />
            <FlyoutSubsection
              title={i18n.translate('xpack.alertingV2.ruleDetails.conditions', {
                defaultMessage: 'Rule conditions',
              })}
              hasBorder
            >
              <RuleConditions variant="summary" />
            </FlyoutSubsection>
          </FlyoutAccordion>

          <EuiSpacer size="m" />

          <FlyoutAccordion
            title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.investigation', {
              defaultMessage: 'Investigation',
            })}
            hasBorder={false}
            initialIsOpen={hasRunbook}
            data-test-subj="ruleSummaryFlyoutInvestigation"
          >
            <RuleSummaryRunbookCard />
          </FlyoutAccordion>

          {canReadActionPolicies ? (
            <>
              <EuiSpacer size="m" />
              <FlyoutAccordion
                title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.actionPolicies', {
                  defaultMessage: 'Action Policies',
                })}
                hasBorder={false}
                initialIsOpen
                data-test-subj="ruleSummaryFlyoutActionPolicies"
              >
                <ActionPoliciesArtifactsSubsection />
              </FlyoutAccordion>
            </>
          ) : null}

          <EuiSpacer size="m" />

          <FlyoutAccordion
            title={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.artifacts', {
              defaultMessage: 'Artifacts',
            })}
            hasBorder={false}
            initialIsOpen={hasDashboards}
            data-test-subj="ruleSummaryFlyoutArtifacts"
          >
            <DashboardArtifactsSubsection />
          </FlyoutAccordion>
        </Body>

        <Footer>
          <Footer.PrimaryAction
            id={TAKE_ACTION_BUTTON_ID}
            label={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.takeAction', {
              defaultMessage: 'Take action',
            })}
            iconType="chevronSingleDown"
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
    </RuleProvider>
  );
};
