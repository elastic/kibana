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
  EuiButtonGroup,
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
import type {
  AlertCondition,
  Comparator,
  SeverityConfig,
  SeverityLevel,
  SeverityMode,
} from './form_types';
import {
  createDefaultSeverityConfig,
  createDefaultSeverityLevels,
  generateId,
  getSeverityValidationError,
  isMultiSeveritySupported,
  nextSeverityLevel,
  MAX_SEVERITY_LEVELS,
} from './form_types';
import {
  SEVERITY_LEVEL_OPTIONS,
  SEVERITY_MODE_OPTIONS,
  SEVERITY_VALIDATION_ERRORS,
} from './translations';

interface SeverityValidationCalloutProps {
  severity: SeverityConfig;
  comparator: Comparator;
}

const SeverityValidationCallout: React.FC<SeverityValidationCalloutProps> = ({
  severity,
  comparator,
}) => {
  const error = getSeverityValidationError(severity, comparator);
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

  const toggleEnabled = (enabled: boolean) =>
    onChange(enabled ? createDefaultSeverityConfig() : undefined);

  const setMode = (mode: SeverityMode) => {
    if (!severity) return;
    // Seed a couple of levels the first time the user switches to multi mode.
    if (mode === 'multi' && severity.levels.length === 0 && condition) {
      onChange({ ...severity, mode, levels: createDefaultSeverityLevels(condition) });
      return;
    }
    onChange({ ...severity, mode });
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
    if (!severity) return;
    const [baseThreshold = 0] = condition?.threshold ?? [];
    onChange({
      ...severity,
      levels: [
        ...severity.levels,
        {
          id: generateId(),
          severity: nextSeverityLevel(severity.levels),
          threshold: baseThreshold,
        },
      ],
    });
  };

  const removeLevel = (index: number) => {
    if (!severity) return;
    onChange({ ...severity, levels: severity.levels.filter((_, i) => i !== index) });
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
          <EuiButtonGroup
            legend={i18n.translate('xpack.alertingV2.ruleBuilder.severity.modeLegend', {
              defaultMessage: 'Severity mode',
            })}
            options={SEVERITY_MODE_OPTIONS.map((option) => ({
              ...option,
              'data-test-subj': `ruleBuilderSeverityMode-${option.id}`,
              ...(option.id === 'multi' && !multiSupported ? { isDisabled: true } : {}),
            }))}
            idSelected={severity.mode}
            onChange={(id) => setMode(id as SeverityMode)}
            buttonSize="compressed"
            data-test-subj="ruleBuilderSeverityMode"
          />

          {!multiSupported && (
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

          <EuiSpacer size="s" />

          {severity.mode === 'single' ? (
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
                <SeverityValidationCallout severity={severity} comparator={condition.comparator} />
              )}
            </>
          )}
        </>
      )}
    </>
  );
};
