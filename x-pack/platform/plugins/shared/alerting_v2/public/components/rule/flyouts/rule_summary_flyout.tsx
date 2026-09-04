/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { paths } from '../../../constants';
import { RuleActionsMenu } from '../../../pages/rules_list_page/rule_actions_menu';
import { TakeActionButton } from './take_action_button';
import { RuleProvider } from '../../rule_details/rule_context';
import { RuleHeaderDescription, RuleTitleWithBadges } from '../../rule_details/rule_summary_header';
import { RuleConditions } from '../../rule_details/sidebar/rule_conditions';
import { RuleMetadata } from '../../rule_details/sidebar/rule_metadata';
import type { RuleApiResponse } from '../../../services/rules_api';
import { useRuleAutoAttach } from '../../../agent_builder/use_rule_auto_attach';

const FLYOUT_TITLE_ID = 'ruleSummaryFlyoutTitle';

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
  session?: EuiFlyoutProps['session'];
  ownFocus?: EuiFlyoutProps['ownFocus'];
  hasAnimation?: EuiFlyoutProps['hasAnimation'];
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
  session,
  ownFocus = true,
  hasAnimation = true,
}: RuleSummaryFlyoutProps) => {
  const { basePath } = useService(CoreStart('http'));
  useRuleAutoAttach(rule);
  const detailsHref = basePath.prepend(paths.ruleDetails(rule.id));

  return (
    <RuleProvider rule={rule}>
      <EuiFlyout
        type="push"
        hasAnimation={hasAnimation}
        size="s"
        ownFocus={ownFocus}
        session={session}
        hideCloseButton
        paddingSize="none"
        onClose={onClose}
        aria-labelledby={FLYOUT_TITLE_ID}
        data-test-subj="ruleSummaryFlyout"
      >
        <EuiPanel
          paddingSize="xs"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiFlexGroup
            justifyContent="flexEnd"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.close', {
                  defaultMessage: 'Close',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="cross"
                  color="text"
                  onClick={onClose}
                  aria-label={i18n.translate('xpack.alertingV2.ruleSummaryFlyout.close', {
                    defaultMessage: 'Close',
                  })}
                  data-test-subj="ruleSummaryFlyoutCloseButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiHorizontalRule margin="none" />
        <EuiFlyoutBody>
          <EuiPanel
            paddingSize="m"
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            color="transparent"
          >
            <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
              <h2 data-test-subj="ruleSummaryFlyoutTitle">
                <RuleTitleWithBadges variant="summary" />
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <RuleHeaderDescription />
          </EuiPanel>
          <EuiHorizontalRule margin="xs" />
          <EuiPanel
            paddingSize="m"
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            color="transparent"
          >
            <RuleConditions variant="summary" />
            <EuiHorizontalRule />
            <RuleMetadata />
          </EuiPanel>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiPanel
            paddingSize="m"
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            color="transparent"
          >
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onClose}
                  data-test-subj="ruleSummaryFlyoutFooterCloseButton"
                >
                  <FormattedMessage
                    id="xpack.alertingV2.ruleSummaryFlyout.close"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RuleActionsMenu
                  rule={rule}
                  canWrite={canWrite}
                  detailsHref={detailsHref}
                  anchorPosition="upRight"
                  onEdit={onEdit}
                  onClone={onClone}
                  onDelete={onDelete}
                  onToggleEnabled={onToggleEnabled}
                  onRun={onRun}
                  onUpdateApiKey={onUpdateApiKey}
                  onViewChangeHistory={onViewChangeHistory}
                  renderButton={({ toggle }) => <TakeActionButton onClick={toggle} />}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </RuleProvider>
  );
};
