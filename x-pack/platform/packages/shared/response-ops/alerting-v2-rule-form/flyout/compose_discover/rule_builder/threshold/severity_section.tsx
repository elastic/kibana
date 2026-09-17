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

  // Adding a second level promotes single → multi: the current single severity becomes the
  // least-severe band (at the condition threshold) and a more-severe band is seeded one step
  // beyond it, so both start out valid for the breach direction.
  const promoteToMulti = () => {
    if (!severity || !condition) return;
    const base: SeverityLevel = {
      id: generateId(),
      severity: severity.singleLevelSeverity,
      threshold: nextSeverityThreshold([], severity.singleLevelSeverity, condition),
    };
    const bandSeverity = nextSeverityLevel([base]);
    const band: SeverityLevel = {
      id: generateId(),
      severity: bandSeverity,
      threshold: nextSeverityThreshold([base], bandSeverity, condition),
    };
    onChange({ ...severity, mode: 'multi', levels: [base, band] });
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
                          value={level.threshold}
                          onChange={(e) =>
                            updateLevel(idx, { threshold: parseFloat(e.target.value) || 0 })
                          }
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
              {condition && (
                <SeverityValidationCallout severity={severity} condition={condition} />
              )}
            </>
          )}
        </>
      )}
    </>
  );
};
