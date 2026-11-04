/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { RuleTableItem } from '../../../../../types';
import {
  getRuleHealthColor,
  getRuleStatusMessage,
} from '../../../../../common/lib/rule_status_helpers';
import type {
  RuleDiagnosis,
  RuleDiagnosisActionId,
} from '../../../../../common/lib/rule_diagnostics';
import { diagnoseRule } from '../../../../../common/lib/rule_diagnostics';
import {
  ALERT_STATUS_LICENSE_ERROR,
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
} from '../../translations';

export interface RuleDiagnoseFlyoutProps {
  rule: RuleTableItem;
  /** Whether the current user and app context allow opening the rule editor. */
  canEditRule: boolean;
  onClose: () => void;
  onAction: (action: RuleDiagnosisActionId, rule: RuleTableItem) => void | Promise<void>;
}

const ACTION_LABELS: Record<RuleDiagnosisActionId, string> = {
  editRule: i18n.translate('xpack.triggersActionsUI.ruleDiagnoseFlyout.actions.editRule', {
    defaultMessage: 'Edit rule',
  }),
  updateApiKey: i18n.translate('xpack.triggersActionsUI.ruleDiagnoseFlyout.actions.updateApiKey', {
    defaultMessage: 'Update API key',
  }),
  enableRule: i18n.translate('xpack.triggersActionsUI.ruleDiagnoseFlyout.actions.enableRule', {
    defaultMessage: 'Enable rule',
  }),
  runRule: i18n.translate('xpack.triggersActionsUI.ruleDiagnoseFlyout.actions.runRule', {
    defaultMessage: 'Run rule now',
  }),
  manageLicense: i18n.translate(
    'xpack.triggersActionsUI.ruleDiagnoseFlyout.actions.manageLicense',
    { defaultMessage: 'Manage license' }
  ),
  viewRuleDetails: i18n.translate(
    'xpack.triggersActionsUI.ruleDiagnoseFlyout.actions.viewRuleDetails',
    { defaultMessage: 'View run history' }
  ),
};

// Error messages often contain long unbreakable tokens (index lists, privilege lists, ids);
// let them wrap instead of forcing a horizontal scroll inside the callout.
const messagesCodeBlockCss = css`
  overflow-wrap: anywhere;
`;

const ACTIONS_REQUIRING_EDIT_PRIVILEGE: ReadonlySet<RuleDiagnosisActionId> = new Set([
  'updateApiKey',
  'enableRule',
  'runRule',
]);

export const RuleDiagnoseFlyout = ({
  rule,
  canEditRule,
  onClose,
  onAction,
}: RuleDiagnoseFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'ruleDiagnoseFlyoutTitle' });
  const diagnoses = useMemo(() => diagnoseRule(rule), [rule]);

  const statusMessage = getRuleStatusMessage({
    rule,
    licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
    lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
    executionStatusTranslations: rulesStatusesTranslationsMapping,
  });

  const isActionDisabled = useCallback(
    (action: RuleDiagnosisActionId) => {
      if (action === 'editRule') {
        return !canEditRule;
      }
      if (ACTIONS_REQUIRING_EDIT_PRIVILEGE.has(action)) {
        return !rule.isEditable;
      }
      return false;
    },
    [canEditRule, rule.isEditable]
  );

  const handleAction = useCallback(
    (action: RuleDiagnosisActionId) => {
      onAction(action, rule);
      onClose();
    },
    [onAction, onClose, rule]
  );

  const renderDiagnosis = (diagnosis: RuleDiagnosis) => {
    const { primaryAction } = diagnosis;
    const Callout = diagnosis.severity === 'danger' ? KbnDangerCallout : KbnWarningCallout;
    return (
      <Callout
        key={diagnosis.id}
        title={diagnosis.title}
        data-test-subj={`ruleDiagnosis-${diagnosis.id}`}
      >
        <EuiText size="s">
          <p>{diagnosis.description}</p>
        </EuiText>
        {diagnosis.messages.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              paddingSize="s"
              fontSize="s"
              isCopyable
              overflowHeight={200}
              css={messagesCodeBlockCss}
              data-test-subj={`ruleDiagnosis-${diagnosis.id}-messages`}
            >
              {diagnosis.messages.join('\n')}
            </EuiCodeBlock>
          </>
        )}
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          {primaryAction && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                color={diagnosis.severity}
                isDisabled={isActionDisabled(primaryAction)}
                onClick={() => handleAction(primaryAction)}
                data-test-subj={`ruleDiagnosis-${diagnosis.id}-${primaryAction}`}
              >
                {ACTION_LABELS[primaryAction]}
              </EuiButton>
            </EuiFlexItem>
          )}
          {diagnosis.secondaryActions.map((action) => (
            <EuiFlexItem grow={false} key={action}>
              <EuiButtonEmpty
                size="s"
                color={diagnosis.severity}
                isDisabled={isActionDisabled(action)}
                onClick={() => handleAction(action)}
                data-test-subj={`ruleDiagnosis-${diagnosis.id}-${action}`}
              >
                {ACTION_LABELS[action]}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </Callout>
    );
  };

  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="ruleDiagnoseFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{rule.name}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={getRuleHealthColor(rule, euiTheme) || 'default'}>
              {statusMessage}
            </EuiHealth>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {rule.ruleType}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {diagnoses.length === 0 ? (
          <EuiText data-test-subj="ruleDiagnoseFlyoutNoProblems">
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.ruleDiagnoseFlyout.noProblems"
                defaultMessage="No problems were detected on the last run of this rule."
              />
            </p>
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m">
            {diagnoses.map((diagnosis) => (
              <EuiFlexItem key={diagnosis.id} grow={false}>
                {renderDiagnosis(diagnosis)}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="ruleDiagnoseFlyoutCloseButton">
              <FormattedMessage
                id="xpack.triggersActionsUI.ruleDiagnoseFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
