/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { paths } from '../constants';
import { RuleBuilderGrid } from '../rule_builders/rule_builder_grid';
import type { RuleBuilderId } from '../rule_builders/rule_builder_definitions';

/** Remember which builder to return to when toggling ES|QL → builder. */
export const RULE_EVALUATION_LAST_BUILDER_SESSION_KEY =
  'alerting-v2.ruleForm.lastEvaluationBuilderId';

export const RULE_EVALUATION_DEFAULT_BUILDER_ID = 'threshold_alert';

export interface RuleEvaluationEsqlHeaderActionsProps {
  /** Current mode shown in the rule evaluation header. */
  selectedMode: 'esql' | 'builder';
  /** Switches to ES|QL after any confirmation handled here. */
  onChange: (next: 'esql' | 'builder') => void;
  /** Switches to guided builder with the chosen builder id (from the picker modal). */
  onPickBuilder: (builderId: string) => void;
  /** Icon for the guided builder action (matches the active or last builder). */
  builderIconType: IconType;
  basePath: { prepend: (path: string) => string };
  showAgentBuilderButton?: boolean;
  onOpenAgentBuilder?: () => void;
}

export const RuleEvaluationEsqlHeaderActions = ({
  selectedMode,
  onChange,
  onPickBuilder,
  builderIconType,
  basePath,
  showAgentBuilderButton,
  onOpenAgentBuilder,
}: RuleEvaluationEsqlHeaderActionsProps) => {
  const [isBuilderPickerOpen, setIsBuilderPickerOpen] = useState(false);
  const [isEsqlSwitchConfirmOpen, setIsEsqlSwitchConfirmOpen] = useState(false);

  const useGuidedBuilderLabel = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.useGuidedBuilder',
    {
      defaultMessage: 'Use guided builder',
    }
  );

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

  const modeToggleButtons = useMemo(
    () => [
      {
        id: 'builder',
        label: builderAria,
        iconType: builderIconType,
        'data-test-subj': 'ruleEvaluationModeBuilder',
      },
      {
        id: 'esql',
        label: esqlAria,
        iconType: 'editorCodeBlock' as const,
        'data-test-subj': 'ruleEvaluationModeEsql',
      },
    ],
    [builderAria, builderIconType, esqlAria]
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
    onChange(next);
  };

  const confirmSwitchToEsql = () => {
    setIsEsqlSwitchConfirmOpen(false);
    onChange('esql');
  };

  const cancelSwitchToEsql = () => {
    setIsEsqlSwitchConfirmOpen(false);
  };

  const handlePickBuilderFromModal = (id: RuleBuilderId) => {
    setIsBuilderPickerOpen(false);
    onPickBuilder(id);
  };

  const hubHref = basePath.prepend(paths.ruleCreate);

  const builderPickerTitle = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleConfigurationMode.builderPickerTitle',
    {
      defaultMessage: 'Choose a rule builder',
    }
  );

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

  if (selectedMode === 'esql') {
    return (
      <>
        <EuiButton
          size="s"
          fill={false}
          color="text"
          onClick={() => setIsBuilderPickerOpen(true)}
          data-test-subj="ruleEvaluationUseGuidedBuilder"
        >
          {useGuidedBuilderLabel}
        </EuiButton>

        {isBuilderPickerOpen ? (
          <EuiModal
            onClose={() => setIsBuilderPickerOpen(false)}
            style={{ width: 880, maxWidth: '90vw' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>{builderPickerTitle}</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <RuleBuilderGrid variant="all" onSelectBuilder={handlePickBuilderFromModal} />
              <EuiSpacer size="m" />
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                wrap
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiLink href={hubHref} data-test-subj="ruleEvaluationBuilderPickerHubLink">
                    <FormattedMessage
                      id="xpack.alertingV2.ruleForm.ruleConfigurationMode.viewCreateHub"
                      defaultMessage="Open create hub (all options)"
                    />
                  </EuiLink>
                </EuiFlexItem>
                {showAgentBuilderButton && onOpenAgentBuilder ? (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      color="text"
                      iconType="productAgent"
                      data-test-subj="ruleEvaluationBuilderPickerAgentButton"
                      onClick={() => {
                        setIsBuilderPickerOpen(false);
                        onOpenAgentBuilder();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.alertingV2.ruleForm.ruleConfigurationMode.askAiAgent"
                        defaultMessage="Ask AI Agent"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty onClick={() => setIsBuilderPickerOpen(false)}>
                {i18n.translate(
                  'xpack.alertingV2.ruleForm.ruleConfigurationMode.builderPickerClose',
                  {
                    defaultMessage: 'Close',
                  }
                )}
              </EuiButtonEmpty>
            </EuiModalFooter>
          </EuiModal>
        ) : null}
      </>
    );
  }

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
          <EuiCallOut
            color="warning"
            title={i18n.translate(
              'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToEsqlCalloutTitle',
              {
                defaultMessage: 'You may not be able to return to the guided builder',
              }
            )}
            iconType="alert"
          >
            <p>
              {i18n.translate(
                'xpack.alertingV2.ruleForm.ruleConfigurationMode.switchToEsqlCalloutBody',
                {
                  defaultMessage:
                    'Switching to ES|QL replaces the guided builder for this section. Values you entered only in the builder may be lost, and raw ES|QL can be harder to map back to the builder. Continue only if you intend to edit the query directly.',
                }
              )}
            </p>
          </EuiCallOut>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
