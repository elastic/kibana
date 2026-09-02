/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleCreateOptionsPanel, type LegacyRuleTypeItem } from './rule_create_options_panel';

const FLYOUT_TITLE_ID = 'ruleCreateOptionsFlyoutTitle';
const CLOSE_LABEL = i18n.translate('xpack.alertingV2.ruleCreateOptionsFlyout.close', {
  defaultMessage: 'Close',
});
const CREATE_RULE_TITLE = i18n.translate('xpack.alertingV2.ruleCreateOptionsFlyout.title', {
  defaultMessage: 'Create rule',
});

/** Matches ComposeDiscoverFlyout so stacking the form on top does not resize the panel. */
const STACKED_FLYOUT_SIZE = 540;
const STACKED_FLYOUT_MIN_WIDTH = 480;

export interface RuleCreateOptionsFlyoutProps {
  onClose: () => void;
  onCreateEsqlRule: () => void;
  onCreateWithAgent: () => void;
  /**
   * When `true`, the "Create with AI Agent" option is rendered disabled. Independent of
   * `createWithAgentTooltipText`.
   */
  createWithAgentDisabled?: boolean;
  /**
   * Optional tooltip text for the "Create with AI Agent" option (e.g. explaining a missing
   * prerequisite). Shown on hover/focus regardless of whether the option is disabled.
   */
  createWithAgentTooltipText?: string;
  onCreateThresholdRule?: () => void;
  legacyRuleTypes?: LegacyRuleTypeItem[];
  /**
   * Shared EUI flyout history key. When set, this flyout is the first entry of a stacked
   * create session (`overlay` + `session="start"`) so Back from the authoring flyout returns here.
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
  historyKey,
}: RuleCreateOptionsFlyoutProps) => {
  const isStacked = historyKey !== undefined;

  return (
    <EuiFlyout
      type={isStacked ? 'overlay' : 'push'}
      size={isStacked ? STACKED_FLYOUT_SIZE : 's'}
      minWidth={isStacked ? STACKED_FLYOUT_MIN_WIDTH : undefined}
      session={isStacked ? 'start' : undefined}
      historyKey={historyKey}
      flyoutMenuProps={
        isStacked
          ? { title: CREATE_RULE_TITLE, titleId: FLYOUT_TITLE_ID, hideCloseButton: true }
          : undefined
      }
      ownFocus
      hideCloseButton
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      data-test-subj="ruleCreateOptionsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
              <h2>{CREATE_RULE_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={CLOSE_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={onClose}
                aria-label={CLOSE_LABEL}
                data-test-subj="ruleCreateOptionsFlyoutCloseButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
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
    </EuiFlyout>
  );
};
