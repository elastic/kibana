/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCodeBlock, EuiDescriptionList, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { useRuleFormMeta } from '../contexts';

const EMPTY_VALUE = '—';

const PLACEHOLDER_QUERY = 'FROM …\n| STATS …';

const RULE_SUMMARY_SUBTITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.ruleEvaluationPreviewRail.subtitle',
  {
    defaultMessage: 'Updates as you edit the Rule configuration section.',
  }
);

/** Best-effort: first `FROM …` target in the evaluation query (non-threshold summary). */
const extractFromTarget = (query: string): string => {
  const trimmed = query.trim();
  if (!trimmed) {
    return EMPTY_VALUE;
  }
  const lines = trimmed.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*FROM\s+(.+)$/i);
    if (m?.[1]) {
      return m[1].trim();
    }
  }
  return EMPTY_VALUE;
};

const formatAlertDelayPreview = (
  mode: FormValues['stateTransitionAlertDelayMode'],
  stateTransition: FormValues['stateTransition']
): string => {
  const n = stateTransition?.pendingCount;
  if (typeof n === 'number' && n > 0) {
    return i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.alertDelayAfterMatches', {
      defaultMessage: 'After {count} matches',
      values: { count: n },
    });
  }
  if (mode === 'immediate') {
    return i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.alertDelayImmediate', {
      defaultMessage: 'Immediate',
    });
  }
  return String(mode);
};

const formatSchedulePreview = (every?: string, lookback?: string): string => {
  if (!every?.trim()) {
    return EMPTY_VALUE;
  }
  const everyTrim = every.trim();
  if (!lookback?.trim()) {
    return i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.scheduleEveryOnly', {
      defaultMessage: 'Every {every}',
      values: { every: everyTrim },
    });
  }
  return i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.scheduleEveryWithLookback', {
    defaultMessage: 'Every {every} (lookback {lookback})',
    values: { every: everyTrim, lookback: lookback.trim() },
  });
};

/**
 * Rule Summary for the evaluation preview column.
 *
 * - **Guided builder** (`includeQueryEditor === false`): read-only {@link EuiCodeBlock} for the
 *   generated ES|QL (from `evaluation.query.base`, updated by the form) plus a details list.
 * - **ES|QL editor mode** (`includeQueryEditor !== false`): details list only.
 */
export const RuleSummaryPreview = () => {
  const { includeQueryEditor, ruleBuilderId } = useRuleFormMeta();
  const { control } = useFormContext<FormValues>();

  /** `undefined` treated like ES|QL mode (same default as {@link RuleForm}). */
  const isGuidedBuilderMode = includeQueryEditor === false;

  const evaluationQuery = useWatch({ control, name: 'evaluation.query.base' });
  const thresholdDataSource = useWatch({ control, name: 'thresholdDataSource' });
  const timeField = useWatch({ control, name: 'timeField' });
  const schedule = useWatch({ control, name: 'schedule' });
  const groupingFields = useWatch({ control, name: 'grouping.fields' });
  const recoveryPolicy = useWatch({ control, name: 'recoveryPolicy' });
  const recoveryQueryBase = useWatch({ control, name: 'recoveryPolicy.query.base' });
  const stateTransition = useWatch({ control, name: 'stateTransition' });
  const stateTransitionAlertDelayMode = useWatch({
    control,
    name: 'stateTransitionAlertDelayMode',
  });

  const isThresholdBuilder = ruleBuilderId === 'threshold_alert';

  const panelTitle = i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.panelTitle', {
    defaultMessage: 'Rule Summary',
  });

  const esqlSectionLabel = i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.esqlQuerySubtitle', {
    defaultMessage: 'ES|QL query',
  });

  const recoveryEsqlSectionLabel = i18n.translate(
    'xpack.alertingV2.ruleForm.ruleSummary.esqlRecoveryQuerySubtitle',
    {
      defaultMessage: 'ES|QL recovery query',
    }
  );

  const queryText = (evaluationQuery ?? '').trim() || PLACEHOLDER_QUERY;
  const recoveryQueryText = (recoveryQueryBase ?? '').trim() || PLACEHOLDER_QUERY;

  const listItems = useMemo(() => {
    const base = evaluationQuery ?? '';
    const dataSource = isThresholdBuilder
      ? thresholdDataSource?.trim() || EMPTY_VALUE
      : extractFromTarget(base);

    const recoveryDescription =
      recoveryPolicy?.type === 'query'
        ? i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.recoveryEsqlQuery', {
            defaultMessage: 'ES|QL recovery query',
          })
        : i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.recoveryNoBreach', {
            defaultMessage: 'No breach',
          });

    return [
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.dataSource', {
          defaultMessage: 'Data source',
        }),
        description: dataSource,
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.groupKey', {
          defaultMessage: 'Group key',
        }),
        description: groupingFields && groupingFields.length > 0 ? groupingFields.join(', ') : EMPTY_VALUE,
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.timeField', {
          defaultMessage: 'Time field',
        }),
        description: timeField?.trim() || EMPTY_VALUE,
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.schedule', {
          defaultMessage: 'Schedule',
        }),
        description: formatSchedulePreview(schedule?.every, schedule?.lookback),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.mode', {
          defaultMessage: 'Mode',
        }),
        description: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.modeDetectOnly', {
          defaultMessage: 'Detect only',
        }),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.recovery', {
          defaultMessage: 'Recovery',
        }),
        description: recoveryDescription,
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.alertDelay', {
          defaultMessage: 'Alert delay',
        }),
        description: formatAlertDelayPreview(stateTransitionAlertDelayMode, stateTransition),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleForm.ruleSummary.noDataConfig', {
          defaultMessage: 'No data config',
        }),
        description: EMPTY_VALUE,
      },
    ];
  }, [
    evaluationQuery,
    groupingFields,
    isThresholdBuilder,
    recoveryPolicy?.type,
    schedule?.every,
    schedule?.lookback,
    stateTransition,
    stateTransitionAlertDelayMode,
    thresholdDataSource,
    timeField,
  ]);

  const showRecoveryQueryBlock =
    isGuidedBuilderMode && recoveryPolicy?.type === 'query';

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="ruleSummaryPreviewPanel">
      <EuiTitle size="xs">
        <h3>{panelTitle}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>{RULE_SUMMARY_SUBTITLE}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {isGuidedBuilderMode ? (
        <>
          <EuiText size="s">
            <p>
              <strong>{esqlSectionLabel}</strong>
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiPanel
            color="subdued"
            paddingSize="s"
            hasShadow={false}
            hasBorder={false}
            data-test-subj="ruleSummaryEsqlQueryShell"
          >
            <div data-test-subj="ruleSummaryBuilderEsqlCodeBlock">
              <EuiCodeBlock language="esql" fontSize="s" paddingSize="m" isCopyable>
                {queryText}
              </EuiCodeBlock>
            </div>
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      ) : (
        <EuiSpacer size="xs" />
      )}

      <EuiPanel paddingSize="none" hasShadow={false} hasBorder={false}>
        <EuiDescriptionList
          type="responsiveColumn"
          columnWidths={[1, 2]}
          compressed
          listItems={listItems}
          data-test-subj="ruleSummaryDetailsGrid"
        />
      </EuiPanel>

      {showRecoveryQueryBlock ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>
              <strong>{recoveryEsqlSectionLabel}</strong>
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiPanel
            color="subdued"
            paddingSize="s"
            hasShadow={false}
            hasBorder={false}
            data-test-subj="ruleSummaryRecoveryEsqlShell"
          >
            <div data-test-subj="ruleSummaryRecoveryEsqlCodeBlock">
              <EuiCodeBlock language="esql" fontSize="s" paddingSize="m" isCopyable>
                {recoveryQueryText}
              </EuiCodeBlock>
            </div>
          </EuiPanel>
        </>
      ) : null}
    </EuiPanel>
  );
};
