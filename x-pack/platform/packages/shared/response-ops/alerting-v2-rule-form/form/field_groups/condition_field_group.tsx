/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiSpacer,
  EuiFormRow,
  EuiFormLabel,
  EuiCodeBlock,
  EuiSuperSelect,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { useRuleFormMeta } from '../contexts';
import { FieldGroup } from './field_group';
import { EvaluationQueryField } from '../fields/evaluation_query_field';
import { GroupFieldSelect } from '../fields/group_field_select';
import { TimeFieldSelect } from '../fields/time_field_select';
import { ThresholdDataSourceField } from '../fields/threshold_data_source_field';
import { ThresholdStatsField } from '../fields/threshold_stats_field';
import { ThresholdAlertConditionsField } from '../fields/threshold_alert_conditions_field';
import { useSyncThresholdEvaluationQuery } from '../hooks/use_sync_threshold_evaluation_query';
import { useEnsureThresholdBuilderDefaults } from '../hooks/use_ensure_threshold_builder_defaults';

interface ConditionFieldGroupProps {
  /**
   * Whether to include the editable base query field.
   * When true, shows an editable ES|QL editor for the base query.
   * When false, shows the base query as read-only (if available).
   */
  includeBase?: boolean;
}

/**
 * Condition field group for configuring alert trigger conditions.
 *
 * This component displays:
 * - An editable ES|QL query editor (when includeBase is true) OR a read-only view of the base query
 *
 * The full ES|QL query defines what data is being evaluated, including any
 * trigger condition (e.g. a trailing WHERE clause).
 */
export const ConditionFieldGroup = ({ includeBase = false }: ConditionFieldGroupProps) => {
  const { euiTheme } = useEuiTheme();
  const { control } = useFormContext<FormValues>();
  const {
    ruleEvaluationHeaderActions,
    ruleBuilderId,
    ruleEvaluationModeLabel,
    ruleBuilderCatalog,
    onRuleBuilderIdChange,
  } = useRuleFormMeta();

  // Read the base query from form state (initialized via useFormDefaults)
  const baseQuery = useWatch({ control, name: 'evaluation.query.base' });

  const isThresholdBuilderUi = ruleBuilderId === 'threshold_alert' && !includeBase;

  /** Guided builder selected, but not the Threshold Alert implementation yet — minimal fields only. */
  const isNonThresholdGuidedBuilderUi =
    !includeBase && Boolean(ruleBuilderId) && ruleBuilderId !== 'threshold_alert';

  useSyncThresholdEvaluationQuery(isThresholdBuilderUi);
  useEnsureThresholdBuilderDefaults(isThresholdBuilderUi);

  const ruleBuilderCatalogControlId = useGeneratedHtmlId({
    prefix: 'ruleFormRuleBuilderCatalog',
  });

  const builderCatalogOptions = useMemo((): Array<EuiSuperSelectOption<string>> => {
    if (!ruleBuilderCatalog?.length) {
      return [];
    }
    return ruleBuilderCatalog.map((entry) => ({
      value: entry.id,
      inputDisplay: entry.title,
      dropdownDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={true}>
            <EuiText size="s">
              <strong>{entry.title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {entry.description}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    }));
  }, [ruleBuilderCatalog]);

  const showBuilderCatalogSelect =
    !includeBase &&
    Boolean(ruleBuilderCatalog?.length && onRuleBuilderIdChange && builderCatalogOptions.length);

  const builderCatalogValueOfSelected = useMemo(() => {
    if (!builderCatalogOptions.length) {
      return '';
    }
    if (ruleBuilderId && builderCatalogOptions.some((o) => o.value === ruleBuilderId)) {
      return ruleBuilderId;
    }
    return builderCatalogOptions[0].value;
  }, [builderCatalogOptions, ruleBuilderId]);

  const ruleBuilderCatalogLabel = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleBuilderCatalog.label',
    {
      defaultMessage: 'Rule builder',
    }
  );

  const titleBadge = showBuilderCatalogSelect
    ? undefined
    : ruleEvaluationModeLabel
      ? (
          <EuiBadge color="hollow">{ruleEvaluationModeLabel}</EuiBadge>
        )
      : undefined;

  const titleRight =
    showBuilderCatalogSelect || ruleEvaluationHeaderActions ? (
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        justifyContent="flexEnd"
        responsive={false}
      >
        {showBuilderCatalogSelect ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              wrap={false}
            >
              <EuiFlexItem grow={false}>
                <EuiFormLabel
                  htmlFor={ruleBuilderCatalogControlId}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {ruleBuilderCatalogLabel}
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div style={{ width: 220, minWidth: 220 }}>
                  <EuiSuperSelect
                    id={ruleBuilderCatalogControlId}
                    options={builderCatalogOptions}
                    valueOfSelected={builderCatalogValueOfSelected}
                    onChange={(id) => onRuleBuilderIdChange?.(id)}
                    compressed
                    fullWidth
                    hasDividers
                    data-test-subj="ruleFormRuleBuilderCatalog"
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        {ruleEvaluationHeaderActions ? (
          <EuiFlexItem grow={false}>{ruleEvaluationHeaderActions}</EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ) : undefined;

  const fieldGroupTitle =
    isThresholdBuilderUi || isNonThresholdGuidedBuilderUi
      ? i18n.translate('xpack.alertingV2.ruleForm.thresholdRuleConditionSectionTitle', {
          defaultMessage: 'Rule condition',
        })
      : i18n.translate('xpack.alertingV2.ruleForm.conditionSectionTitle', {
          defaultMessage: 'Rule configuration',
        });

  const nonThresholdPrototypeNotice = i18n.translate(
    'xpack.alertingV2.ruleForm.nonThresholdBuilder.prototypeNotice',
    {
      defaultMessage: 'This form is under construction. Prototype purpose only.',
    }
  );

  const nonThresholdPrototypeNoticeAriaLabel = i18n.translate(
    'xpack.alertingV2.ruleForm.nonThresholdBuilder.prototypeNoticeAriaLabel',
    {
      defaultMessage: 'Prototype notice',
    }
  );

  return (
    <FieldGroup
      title={fieldGroupTitle}
      titleBadge={titleBadge}
      sectionDomId="ruleEvaluationSection"
      titleRight={titleRight}
    >
      {isThresholdBuilderUi ? (
        <>
          <ThresholdDataSourceField />
          <EuiSpacer size="m" />
          <GroupFieldSelect />
          <TimeFieldSelect />
          <EuiSpacer size="m" />
          <ThresholdStatsField />
          <EuiSpacer size="m" />
          <ThresholdAlertConditionsField />
        </>
      ) : isNonThresholdGuidedBuilderUi ? (
        <>
          <EuiFormRow label={false} fullWidth>
            <EuiTextArea
              readOnly
              value={nonThresholdPrototypeNotice}
              fullWidth
              rows={3}
              aria-label={nonThresholdPrototypeNoticeAriaLabel}
              data-test-subj="ruleFormNonThresholdBuilderPrototypeNotice"
              css={css`
                color: ${euiTheme.colors.dangerText};
              `}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <GroupFieldSelect />
          <TimeFieldSelect />
        </>
      ) : includeBase ? (
        // Editable base query
        <>
          <EvaluationQueryField />
          <EuiSpacer size="m" />
          <GroupFieldSelect />
          <TimeFieldSelect />
        </>
      ) : (
        // Read-only base query (only show if there's a query to display)
        <>
          {baseQuery && (
            <>
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.ruleForm.baseQueryLabel', {
                  defaultMessage: 'Base query',
                })}
                fullWidth
              >
                <EuiCodeBlock language="esql" fontSize="m" paddingSize="m" isCopyable>
                  {baseQuery}
                </EuiCodeBlock>
              </EuiFormRow>
              <EuiSpacer size="m" />
            </>
          )}
          <GroupFieldSelect />
          <TimeFieldSelect />
        </>
      )}
    </FieldGroup>
  );
};
