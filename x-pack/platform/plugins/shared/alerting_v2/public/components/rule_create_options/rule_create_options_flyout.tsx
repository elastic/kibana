/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleCreateOptionsPanel, type LegacyRuleTypeItem } from './rule_create_options_panel';

const FLYOUT_TITLE_ID = 'ruleCreateOptionsFlyoutTitle';

/**
 * Match ComposeDiscoverFlyout width so picker ↔ form history transitions stay balanced.
 */
const CREATE_FLOW_OPTIONS_FLYOUT_SIZE = 540;

export interface RuleCreateOptionsFlyoutProps {
  onClose: () => void;
  onCreateEsqlRule: () => void;
  onCreateWithAgent: () => void;
  /**
   * When `true`, the "With AI Agent" option is rendered disabled. Independent of
   * `createWithAgentTooltipText`.
   */
  createWithAgentDisabled?: boolean;
  /**
   * Optional tooltip text for the "With AI Agent" option (e.g. explaining a missing
   * prerequisite). Shown on hover/focus regardless of whether the option is disabled.
   */
  createWithAgentTooltipText?: string;
  onCreateThresholdRule?: () => void;
  legacyRuleTypes?: LegacyRuleTypeItem[];
  /** Opens the v2 Rules page. When set, a footer with a Manage rules action is shown. */
  onManageRules?: () => void;
  /**
   * Shared EUI flyout-history key for a continuous create session (picker → form → Back).
   * When set, the picker mounts as `session="start"`. The form must also use
   * `session="start"` with this same key (not `inherit`) so history stacks.
   */
  historyKey?: symbol;
}

export const RuleCreateOptionsFlyout = ({
  onClose,
  onCreateEsqlRule,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
  onCreateThresholdRule,
  legacyRuleTypes,
  onManageRules,
  historyKey,
}: RuleCreateOptionsFlyoutProps) => {
  const isHistorySession = historyKey !== undefined;
  const flyoutTitle = i18n.translate('xpack.alertingV2.ruleCreateOptionsFlyout.title', {
    defaultMessage: 'Create rule',
  });

  return (
    <EuiFlyout
      type={isHistorySession ? 'overlay' : 'push'}
      size={isHistorySession ? CREATE_FLOW_OPTIONS_FLYOUT_SIZE : 's'}
      ownFocus
      hideCloseButton={!isHistorySession}
      session={isHistorySession ? 'start' : undefined}
      historyKey={historyKey}
      flyoutMenuProps={
        isHistorySession
          ? {
              title: flyoutTitle,
              titleId: FLYOUT_TITLE_ID,
            }
          : undefined
      }
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      data-test-subj="ruleCreateOptionsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
              <h2>{flyoutTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {!isHistorySession ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.alertingV2.ruleCreateOptionsFlyout.close', {
                  defaultMessage: 'Close',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="cross"
                  color="text"
                  onClick={onClose}
                  aria-label={i18n.translate('xpack.alertingV2.ruleCreateOptionsFlyout.close', {
                    defaultMessage: 'Close',
                  })}
                  data-test-subj="ruleCreateOptionsFlyoutCloseButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <RuleCreateOptionsPanel
          layout="vertical"
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          createWithAgentDisabled={createWithAgentDisabled}
          createWithAgentTooltipText={createWithAgentTooltipText}
          onCreateThresholdRule={onCreateThresholdRule}
          legacyRuleTypes={legacyRuleTypes}
        />
      </EuiFlyoutBody>
      {onManageRules ? (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                iconType="gear"
                iconSide="left"
                onClick={onManageRules}
                data-test-subj="ruleCreateOptionsFlyoutManageRules"
              >
                <FormattedMessage
                  id="xpack.alertingV2.ruleCreateOptionsFlyout.manageRules"
                  defaultMessage="Manage rules"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
};
