/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { AlertEventSeverity } from '@kbn/alerting-v2-schemas';
import type { AlertCondition, SeverityConfig, SeverityLevel } from './form_types';
import {
  compareSeverity,
  createDefaultSeverityConfig,
  generateId,
  getSeverityValidationError,
  isAscendingComparator,
  isMultiSeveritySupported,
  nextSeverityLevel,
  nextSeverityThreshold,
  MAX_SEVERITY_LEVELS,
} from './form_types';
import { SEVERITY_LEVEL_OPTIONS, SEVERITY_VALIDATION_ERRORS } from './translations';

interface SeverityValidationCalloutProps {
  severity: SeverityConfig;
  condition: AlertCondition;
}

const SeverityValidationCallout: React.FC<SeverityValidationCalloutProps> = ({
  severity,
  condition,
}) => {
  const error = getSeverityValidationError(severity, condition);
  if (!error) return null;
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        color="danger"
        iconType="error"
        title={SEVERITY_VALIDATION_ERRORS[error]}
        data-test-subj="ruleBuilderSeverityValidationError"
      />
    </>
  );
};
interface SeveritySectionProps {
  severity: SeverityConfig | undefined;
  alertConditions: AlertCondition[];
  onChange: (severity: SeverityConfig | undefined) => void;
}

export const SeveritySection: React.FC<SeveritySectionProps> = ({
  severity,
  alertConditions,
  onChange,
}) => {
  const condition = alertConditions[0];
  const multiSupported = condition ? isMultiSeveritySupported(condition.comparator) : false;

  // Guide the threshold inputs so a band cannot be set less extreme than the breach itself:
  // a lower bound for ascending comparators (`>`/`>=`), an upper bound for descending ones.
  const ascending = condition ? isAscendingComparator(condition.comparator) : true;
  const conditionThreshold = condition?.threshold[0];
  const thresholdMin = ascending ? conditionThreshold : undefined;
  const thresholdMax = ascending ? undefined : conditionThreshold;

  const toggleEnabled = (enabled: boolean) =>
    onChange(enabled ? createDefaultSeverityConfig() : undefined);

  // Adding a second level promotes single → multi. The two severities are ordered least-to-most
  // severe (the current single severity may be more or less severe than the seeded one, e.g. when
  // it is already `critical`), then the least-severe band is seeded at the condition threshold and
  // the more-severe one a step beyond it — so both start out valid for the breach direction.
  const promoteToMulti = () => {
    if (!severity || !condition) return;
    const singleSeverity = severity.singleLevelSeverity;
    const [leastSeverity, mostSeverity] = [
      singleSeverity,
      nextSeverityLevel([{ id: '', severity: singleSeverity, threshold: 0 }]),
    ].sort(compareSeverity);
    const least: SeverityLevel = {
      id: generateId(),
      severity: leastSeverity,
      threshold: nextSeverityThreshold([], leastSeverity, condition),
    };
    const most: SeverityLevel = {
      id: generateId(),
      severity: mostSeverity,
      threshold: nextSeverityThreshold([least], mostSeverity, condition),
    };

    // Preserve the original order
    const levels = least.severity === singleSeverity ? [least, most] : [most, least];

    onChange({ ...severity, mode: 'multi', levels });
  };

  const setSingleLevel = (level: AlertEventSeverity) => {
    if (!severity) return;
    onChange({ ...severity, singleLevelSeverity: level });
  };

  const updateLevel = (index: number, updates: Partial<SeverityLevel>) => {
    if (!severity) return;
    onChange({
      ...severity,
      levels: severity.levels.map((lvl, i) => (i === index ? { ...lvl, ...updates } : lvl)),
    });
  };

  const addLevel = () => {
    if (!severity || !condition) return;
    const bandSeverity = nextSeverityLevel(severity.levels);
    onChange({
      ...severity,
      levels: [
        ...severity.levels,
        {
          id: generateId(),
          severity: bandSeverity,
          threshold: nextSeverityThreshold(severity.levels, bandSeverity, condition),
        },
      ],
    });
  };

  // Removing down to a single level demotes multi → single, keeping the remaining level.
  const removeLevel = (index: number) => {
    if (!severity) return;
    const remaining = severity.levels.filter((_, i) => i !== index);
    if (remaining.length <= 1) {
      onChange({
        ...severity,
        mode: 'single',
        singleLevelSeverity: remaining[0]?.severity ?? severity.singleLevelSeverity,
        levels: [],
      });
      return;
    }
    onChange({ ...severity, levels: remaining });
  };

  return (
    <>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.alertingV2.ruleBuilder.severity.title"
                defaultMessage="Severity"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate('xpack.alertingV2.ruleBuilder.severity.enableLabel', {
              defaultMessage: 'Assign a severity',
            })}
            checked={Boolean(severity)}
            onChange={(e) => toggleEnabled(e.target.checked)}
            data-test-subj="ruleBuilderSeverityEnable"
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {severity && (
        <>
          <EuiSpacer size="m" />

          {severity.mode === 'single' ? (
            <>
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.ruleBuilder.severity.levelLabel', {
                  defaultMessage: 'Severity level',
                })}
                fullWidth
              >
                <EuiSelect
                  fullWidth
                  compressed
                  options={SEVERITY_LEVEL_OPTIONS}
                  value={severity.singleLevelSeverity}
                  onChange={(e) => setSingleLevel(e.target.value as AlertEventSeverity)}
                  data-test-subj="ruleBuilderSeveritySingleLevel"
                />
              </EuiFormRow>
              {multiSupported ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiButtonEmpty
                    size="s"
                    iconType="plusCircle"
                    onClick={promoteToMulti}
                    data-test-subj="ruleBuilderAddSeverityLevel"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.ruleBuilder.severity.addLevelButton"
                      defaultMessage="Add severity level"
                    />
                  </EuiButtonEmpty>
                </>
              ) : (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.alertingV2.ruleBuilder.severity.multiUnsupported"
                      defaultMessage="Multiple severity levels are not available for between comparators."
                    />
                  </EuiText>
                </>
              )}
            </>
          ) : (
            <>
              {severity.levels.map((level, idx) => (
                <React.Fragment key={level.id}>
                  {idx > 0 && <EuiSpacer size="s" />}
                  <EuiFlexGroup gutterSize="s" alignItems="flexEnd" wrap>
                    <EuiFlexItem grow={2}>
                      <EuiFormRow
                        label={
                          idx === 0
                            ? i18n.translate('xpack.alertingV2.ruleBuilder.severity.levelLabel', {
                                defaultMessage: 'Severity level',
                              })
                            : undefined
                        }
                        fullWidth
                      >
                        <EuiSelect
                          fullWidth
                          compressed
                          options={SEVERITY_LEVEL_OPTIONS}
                          value={level.severity}
                          onChange={(e) =>
                            updateLevel(idx, { severity: e.target.value as AlertEventSeverity })
                          }
                          aria-label={i18n.translate(
                            'xpack.alertingV2.ruleBuilder.severity.levelAriaLabel',
                            {
                              defaultMessage: 'Severity level for band {band}',
                              values: { band: idx + 1 },
                            }
                          )}
                          data-test-subj={`ruleBuilderSeverityLevel-${idx}`}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem grow={1}>
                      <EuiFormRow
                        label={
                          idx === 0
                            ? i18n.translate(
                                'xpack.alertingV2.ruleBuilder.severity.thresholdLabel',
                                { defaultMessage: 'Threshold' }
                              )
                            : undefined
                        }
                        fullWidth
                      >
                        {/* Operator is inherited from the alert condition and shown as a
                            read-only prepend — it cannot differ per severity level. */}
                        <EuiFieldNumber
                          fullWidth
                          compressed
                          prepend={condition?.comparator ?? ''}
                          min={thresholdMin}
                          max={thresholdMax}
                          // Keep an empty/partial entry as NaN (not coerced to 0) so validation
                          // rejects it instead of silently saving a value the user never typed.
                          value={Number.isFinite(level.threshold) ? level.threshold : ''}
                          onChange={(e) =>
                            updateLevel(idx, { threshold: parseFloat(e.target.value) })
                          }
                          aria-label={i18n.translate(
                            'xpack.alertingV2.ruleBuilder.severity.thresholdAriaLabel',
                            {
                              defaultMessage: 'Threshold for band {band}',
                              values: { band: idx + 1 },
                            }
                          )}
                          data-test-subj={`ruleBuilderSeverityThreshold-${idx}`}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    {severity.levels.length > 1 && (
                      <EuiFlexItem grow={false}>
                        <EuiFormRow
                          hasEmptyLabelSpace={idx === 0}
                          display="centerCompressed"
                          fullWidth
                        >
                          <EuiToolTip
                            content={i18n.translate(
                              'xpack.alertingV2.ruleBuilder.severity.removeLevel',
                              { defaultMessage: 'Remove severity level' }
                            )}
                            disableScreenReaderOutput
                          >
                            <EuiButtonIcon
                              iconType="trash"
                              color="danger"
                              aria-label={i18n.translate(
                                'xpack.alertingV2.ruleBuilder.severity.removeLevel',
                                { defaultMessage: 'Remove severity level' }
                              )}
                              onClick={() => removeLevel(idx)}
                              data-test-subj={`ruleBuilderRemoveSeverityLevel-${idx}`}
                            />
                          </EuiToolTip>
                        </EuiFormRow>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </React.Fragment>
              ))}
              <EuiSpacer size="s" />
              <EuiButtonEmpty
                size="s"
                iconType="plusCircle"
                onClick={addLevel}
                isDisabled={severity.levels.length >= MAX_SEVERITY_LEVELS}
                data-test-subj="ruleBuilderAddSeverityLevel"
              >
                <FormattedMessage
                  id="xpack.alertingV2.ruleBuilder.severity.addLevelButton"
                  defaultMessage="Add severity level"
                />
              </EuiButtonEmpty>
              {condition && <SeverityValidationCallout severity={severity} condition={condition} />}
            </>
          )}
        </>
      )}
    </>
  );
};
