/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import type { RuleExecutionView, RuleResponse } from '@kbn/alerting-v2-schemas';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RulesApi } from '../../../services/rules_api';
import { buildRuleDiagnosisContext } from './build_rule_diagnosis_handoff';
import { useDiagnoseAvailability } from './use_diagnose_availability';

const diagnoseLabel = i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.label', {
  defaultMessage: 'Diagnose with AI',
});

interface UseRuleDiagnoseButtonParams {
  /** Resolve a rule name for the conversation title and prompt; falls back to the rule id. */
  getRuleName: (ruleId: string) => string | undefined;
}

/**
 * Returns a renderer for the failed-rule "Diagnose with AI" action, styled like the workflows
 * failed-step panel: a "Diagnose with AI" button with the sparkles icon. Returns null in state D
 * (hidden); in state C it renders the license teaser instead of a button.
 */
export const useRuleDiagnoseButton = ({
  getRuleName,
}: UseRuleDiagnoseButtonParams): ((execution: RuleExecutionView) => React.ReactNode) => {
  const rulesApi = useService(RulesApi);
  const {
    state,
    requiredLicenseTier,
    isHandoffInFlight,
    openDiagnose,
    openLicenseManagement,
    licenseManagementHref,
  } = useDiagnoseAvailability();
  const [loadingExecutionId, setLoadingExecutionId] = useState<string | null>(null);

  const onDiagnose = useCallback(
    async (execution: RuleExecutionView) => {
      setLoadingExecutionId(execution.id);
      let rule: RuleResponse | null = null;
      try {
        rule = await rulesApi.getRule(execution.rule.id);
      } catch {
        // The rule may have been deleted or be unreadable; diagnose from the execution alone.
      }
      setLoadingExecutionId(null);

      openDiagnose(
        buildRuleDiagnosisContext({
          execution,
          ruleName: rule?.metadata.name ?? getRuleName(execution.rule.id) ?? execution.rule.id,
          rule,
        })
      );
    },
    [rulesApi, openDiagnose, getRuleName]
  );

  return useCallback(
    (execution: RuleExecutionView): React.ReactNode => {
      if (state === 'd') {
        return null;
      }

      if (state === 'c') {
        return (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            data-test-subj="ruleExecutionDiagnoseLicenseTeaser"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="sparkles" size="s" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.alertingV2.executionHistory.rulesTab.diagnose.licenseTeaser"
                  defaultMessage="Diagnose with AI — {licenseLink}"
                  values={{
                    licenseLink: (
                      <EuiLink
                        href={licenseManagementHref}
                        onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                          event.preventDefault();
                          openLicenseManagement();
                        }}
                        data-test-subj="ruleExecutionDiagnoseLicenseLink"
                      >
                        {i18n.translate(
                          'xpack.alertingV2.executionHistory.rulesTab.diagnose.requiresLicense',
                          {
                            defaultMessage: 'requires {tier} license',
                            values: { tier: requiredLicenseTier },
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      const isLoading = isHandoffInFlight || loadingExecutionId === execution.id;
      return (
        <EuiButton
          size="s"
          color="danger"
          fill={false}
          iconType="sparkles"
          onClick={() => {
            void onDiagnose(execution);
          }}
          isLoading={isLoading}
          isDisabled={isLoading}
          data-test-subj="ruleExecutionDiagnoseButton"
          aria-label={diagnoseLabel}
        >
          {diagnoseLabel}
        </EuiButton>
      );
    },
    [
      state,
      requiredLicenseTier,
      licenseManagementHref,
      isHandoffInFlight,
      loadingExecutionId,
      openLicenseManagement,
      onDiagnose,
    ]
  );
};
