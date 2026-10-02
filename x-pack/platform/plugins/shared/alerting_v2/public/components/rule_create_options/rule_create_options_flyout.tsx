/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
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
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  STACKED_FLYOUT_MIN_WIDTH,
  STACKED_FLYOUT_SIZE,
  useEuiFlyoutReregister,
} from '@kbn/alerting-v2-rule-form';
import { i18n } from '@kbn/i18n';
import { RuleCreateOptionsPanel, type LegacyRuleTypeItem } from './rule_create_options_panel';

const FLYOUT_TITLE_ID = 'ruleCreateOptionsFlyoutTitle';
const CLOSE_LABEL = i18n.translate('xpack.alertingV2.ruleCreateOptionsFlyout.close', {
  defaultMessage: 'Close',
});
const CREATE_RULE_TITLE = i18n.translate('xpack.alertingV2.ruleCreateOptionsFlyout.title', {
  defaultMessage: 'Create rule',
});

export interface RuleCreateOptionsFlyoutProps {
  onClose: () => void;
  onCreateEsqlRule: () => void;
  onCreateWithAgent: () => void;
  onCreateThresholdRule?: () => void;
  legacyRuleTypes?: LegacyRuleTypeItem[];
  /**
   * Shared EUI flyout history key. When set, this flyout is the first entry of a stacked
   * create session (`overlay` + `session="start"`) so Back from the authoring flyout returns here.
   */
  historyKey?: EuiFlyoutProps['historyKey'];
  /**
   * When the authoring form is stacked on this picker, EUI cascades (and the menu close,
   * which unregisters this flyout first) must remount it so the form can still confirm.
   * Cascades while the form is not open dismiss the picker.
   */
  retainOnCascade?: boolean;
}

export const RuleCreateOptionsFlyout = ({
  onClose,
  onCreateEsqlRule,
  onCreateWithAgent,
  onCreateThresholdRule,
  legacyRuleTypes,
  historyKey,
  retainOnCascade = false,
}: RuleCreateOptionsFlyoutProps) => {
  const isStacked = historyKey !== undefined;
  const { flyoutKey, reregister } = useEuiFlyoutReregister();

  const handleFlyoutClose: EuiFlyoutProps['onClose'] = useCallback(
    (_event, meta) => {
      const retain = isStacked && retainOnCascade;
      if (meta?.reason === 'navigation-cascade') {
        /*
         * The form's X calls closeAllFlyouts() before it decides to confirm, which
         * unregisters this picker. Stay mounted only while that form is still open.
         * Any other cascade dismisses the picker.
         */
        if (retain) {
          reregister();
          return;
        }
        onClose();
        return;
      }
      /*
       * Menu close already unregistered this flyout. Remount when the form is open
       * so it can confirm, then let the parent run that confirm.
       */
      if (retain) {
        reregister();
      }
      onClose();
    },
    [isStacked, onClose, retainOnCascade, reregister]
  );

  return (
    <EuiFlyout
      key={flyoutKey}
      type={isStacked ? 'overlay' : 'push'}
      size={isStacked ? STACKED_FLYOUT_SIZE : 's'}
      minWidth={isStacked ? STACKED_FLYOUT_MIN_WIDTH : undefined}
      session={isStacked ? 'start' : undefined}
      historyKey={historyKey}
      flyoutMenuProps={
        isStacked ? { title: CREATE_RULE_TITLE, titleId: FLYOUT_TITLE_ID } : undefined
      }
      ownFocus
      hideCloseButton={!isStacked}
      onClose={handleFlyoutClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      data-test-subj="ruleCreateOptionsFlyout"
      data-flyout-key={flyoutKey}
    >
      {isStacked ? null : (
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
      )}
      <EuiFlyoutBody>
        <RuleCreateOptionsPanel
          layout="vertical"
          onCreateEsqlRule={onCreateEsqlRule}
          onCreateWithAgent={onCreateWithAgent}
          onCreateThresholdRule={onCreateThresholdRule}
          legacyRuleTypes={legacyRuleTypes}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
