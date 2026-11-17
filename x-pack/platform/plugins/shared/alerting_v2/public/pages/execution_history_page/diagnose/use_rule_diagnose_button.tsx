/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { RuleExecutionView, RuleResponse } from '@kbn/alerting-v2-schemas';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useAreAgentBuilderSkillsAvailable } from '../../../hooks/use_are_agent_builder_skills_available';
import { RulesApi } from '../../../services/rules_api';
import { buildRuleDiagnosisContext } from './build_rule_diagnosis_handoff';
import {
  diagnoseHandoffErrorToastTitle,
  openRuleFailureDiagnosisChat,
} from './open_rule_failure_diagnosis_chat';

const diagnoseLabel = i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.label', {
  defaultMessage: 'Diagnose with AI',
});

const MISSING_PRIVILEGE_TOOLTIP = i18n.translate(
  'xpack.alertingV2.executionHistory.rulesTab.diagnose.missingPrivilegeTooltip',
  {
    defaultMessage:
      'To diagnose failures with the AI Agent, you need the "Agent Builder: Read" privilege.',
  }
);

interface UseRuleDiagnoseButtonParams {
  /** Resolve a rule name for the conversation title and prompt; falls back to the rule id. */
  getRuleName: (ruleId: string) => string | undefined;
}

/**
 * Returns a renderer for the failed-rule "Diagnose with AI" action, styled like the workflows
 * failed-step panel. Visibility follows the other alerting v2 "with AI Agent" entry points: the
 * button is always shown and is disabled, with a tooltip, when the user lacks the Agent Builder
 * capability. The license and LLM connector are not checked here; Agent Builder handles them.
 */
export const useRuleDiagnoseButton = ({
  getRuleName,
}: UseRuleDiagnoseButtonParams): ((execution: RuleExecutionView) => React.ReactNode) => {
  const rulesApi = useService(RulesApi);
  const agentBuilder = useService(PluginStart('agentBuilder'), { optional: true }) as
    | AgentBuilderPluginStart
    | undefined;
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const isAvailable = useAreAgentBuilderSkillsAvailable() && agentBuilder != null;
  const [loadingExecutionId, setLoadingExecutionId] = useState<string | null>(null);

  const onDiagnose = useCallback(
    async (execution: RuleExecutionView) => {
      if (!agentBuilder) {
        return;
      }

      setLoadingExecutionId(execution.id);
      let rule: RuleResponse | null = null;
      try {
        rule = await rulesApi.getRule(execution.rule.id);
      } catch {
        // The rule may have been deleted or be unreadable; diagnose from the execution alone.
      }

      try {
        openRuleFailureDiagnosisChat({
          agentBuilder,
          http,
          context: buildRuleDiagnosisContext({
            execution,
            ruleName: rule?.metadata.name ?? getRuleName(execution.rule.id) ?? execution.rule.id,
            rule,
          }),
        });
      } catch (error) {
        notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: diagnoseHandoffErrorToastTitle(),
        });
      } finally {
        setLoadingExecutionId(null);
      }
    },
    [agentBuilder, rulesApi, http, notifications, getRuleName]
  );

  return useCallback(
    (execution: RuleExecutionView): React.ReactNode => {
      const isLoading = loadingExecutionId === execution.id;
      const button = (
        <EuiButton
          size="s"
          color="danger"
          fill={false}
          iconType="sparkles"
          onClick={() => {
            void onDiagnose(execution);
          }}
          isLoading={isLoading}
          isDisabled={!isAvailable || isLoading}
          data-test-subj="ruleExecutionDiagnoseButton"
          aria-label={diagnoseLabel}
        >
          {diagnoseLabel}
        </EuiButton>
      );

      if (isAvailable) {
        return button;
      }

      // A disabled button swallows pointer events, so the tooltip anchors on a wrapper.
      return (
        <EuiToolTip content={MISSING_PRIVILEGE_TOOLTIP}>
          <span tabIndex={0} css={{ display: 'inline-block' }}>
            {button}
          </span>
        </EuiToolTip>
      );
    },
    [isAvailable, loadingExecutionId, onDiagnose]
  );
};
