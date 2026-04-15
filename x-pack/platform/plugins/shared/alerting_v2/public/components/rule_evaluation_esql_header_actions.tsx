/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiButtonGroup, EuiConfirmModal, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Remember which builder to return to when toggling ES|QL → builder. */
export const RULE_EVALUATION_LAST_BUILDER_SESSION_KEY =
  'alerting-v2.ruleForm.lastEvaluationBuilderId';

export const RULE_EVALUATION_DEFAULT_BUILDER_ID = 'threshold_alert';

export interface RuleEvaluationEsqlHeaderActionsProps {
  /** Current mode shown in the rule evaluation header. */
  selectedMode: 'esql' | 'builder';
  /** Switches to ES|QL after any confirmation handled here, or to guided builder. */
  onChange: (next: 'esql' | 'builder') => void;
}

export const RuleEvaluationEsqlHeaderActions = ({
  selectedMode,
  onChange,
}: RuleEvaluationEsqlHeaderActionsProps) => {
  const [isEsqlSwitchConfirmOpen, setIsEsqlSwitchConfirmOpen] = useState(false);
  const [isBuilderSwitchConfirmOpen, setIsBuilderSwitchConfirmOpen] = useState(false);

  const toggleLegend = i18n.translate('xpack.alertingV2.ruleForm.ruleConfigurationMode.legend', {
    defaultMessage: 'Rule configuration: guided builder or ES|QL',
  });

  const esqlAria = i18n.translate('xpack.alertingV2.ruleForm.ruleConfigurationMode.esqlAria', {
    defaultMessage: 'ES|QL editor',
  });

  const builderAria = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.builderAria',
    {
      defaultMessage: 'Guided builder',
    }
  );

  const builderTooltip = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.builderTooltip',
    {
      defaultMessage:
        'Guided builder: configure the rule with structured fields and controls instead of raw ES|QL.',
    }
  );

  const esqlTooltip = i18n.translate('xpack.alertingV2.ruleForm.ruleConfigurationMode.esqlTooltip', {
    defaultMessage: 'ES|QL: edit the evaluation query directly with the ES|QL editor.',
  });

  const modeToggleButtons = useMemo(
    () => [
      {
        id: 'builder',
        label: builderAria,
        iconType: 'dashboardApp' as const,
        'data-test-subj': 'ruleEvaluationModeBuilder',
        toolTipContent: builderTooltip,
      },
      {
        id: 'esql',
        label: esqlAria,
        iconType: 'editorCodeBlock' as const,
        'data-test-subj': 'ruleEvaluationModeEsql',
        toolTipContent: esqlTooltip,
      },
    ],
    [builderAria, builderTooltip, esqlAria, esqlTooltip]
  );

  const handleButtonGroupChange = (optionId: string) => {
    const next = optionId as 'esql' | 'builder';
    if (next === selectedMode) {
      return;
    }
    if (next === 'esql') {
      setIsEsqlSwitchConfirmOpen(true);
      return;
    }
    if (next === 'builder') {
      setIsBuilderSwitchConfirmOpen(true);
      return;
    }
  };

  const confirmSwitchToEsql = () => {
    setIsEsqlSwitchConfirmOpen(false);
    onChange('esql');
  };

  const cancelSwitchToEsql = () => {
    setIsEsqlSwitchConfirmOpen(false);
  };

  const confirmSwitchToBuilder = () => {
    setIsBuilderSwitchConfirmOpen(false);
    onChange('builder');
  };

  const cancelSwitchToBuilder = () => {
    setIsBuilderSwitchConfirmOpen(false);
  };

  const esqlSwitchTitle = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToEsqlTitle',
    {
      defaultMessage: 'Switch to ES|QL?',
    }
  );

  const esqlSwitchConfirm = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToEsqlConfirm',
    {
      defaultMessage: 'Switch to ES|QL',
    }
  );

  const esqlSwitchCancel = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToEsqlCancel',
    {
      defaultMessage: 'Cancel',
    }
  );

  const switchModeSharedExplanation = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchModeSharedExplanation',
    {
      defaultMessage:
        'We will try to carry over all relevant data when you switch. Some fields you already selected may not transfer and could be reset.',
    }
  );

  const switchToEsqlSupplement = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToEsqlSupplement',
    {
      defaultMessage:
        'After switching, raw ES|QL can be harder to map back to the guided builder. Continue only if you intend to edit the query directly.',
    }
  );

  const builderSwitchTitle = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToBuilderTitle',
    {
      defaultMessage: 'Switch to guided builder?',
    }
  );

  const switchToBuilderSupplement = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToBuilderSupplement',
    {
      defaultMessage:
        'The guided builder may reorganize or replace parts of your ES|QL query into structured steps.',
    }
  );

  const builderSwitchConfirm = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToBuilderConfirm',
    {
      defaultMessage: 'Switch to guided builder',
    }
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={toggleLegend}
            options={modeToggleButtons}
            idSelected={selectedMode}
            onChange={handleButtonGroupChange}
            buttonSize="compressed"
            isIconOnly
            isFullWidth={false}
            data-test-subj="ruleEvaluationModeToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isEsqlSwitchConfirmOpen ? (
        <EuiConfirmModal
          title={esqlSwitchTitle}
          onCancel={cancelSwitchToEsql}
          onConfirm={confirmSwitchToEsql}
          cancelButtonText={esqlSwitchCancel}
          confirmButtonText={esqlSwitchConfirm}
          defaultFocusedButton="cancel"
          buttonColor="warning"
          data-test-subj="ruleEvaluationSwitchToEsqlConfirm"
        >
          <p>{switchModeSharedExplanation}</p>
          <EuiSpacer size="s" />
          <p>{switchToEsqlSupplement}</p>
        </EuiConfirmModal>
      ) : null}

      {isBuilderSwitchConfirmOpen ? (
        <EuiConfirmModal
          title={builderSwitchTitle}
          onCancel={cancelSwitchToBuilder}
          onConfirm={confirmSwitchToBuilder}
          cancelButtonText={esqlSwitchCancel}
          confirmButtonText={builderSwitchConfirm}
          defaultFocusedButton="cancel"
          buttonColor="warning"
          data-test-subj="ruleEvaluationSwitchToBuilderConfirm"
        >
          <p>{switchModeSharedExplanation}</p>
          <EuiSpacer size="s" />
          <p>{switchToBuilderSupplement}</p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
