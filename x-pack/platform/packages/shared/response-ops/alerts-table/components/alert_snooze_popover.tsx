/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import moment, { type Moment } from 'moment';
import type { MuteCondition } from '@kbn/alerting-types';

const POPOVER_WIDTH_PX = 340;
const popoverContentCss = css`
  width: ${POPOVER_WIDTH_PX}px;
`;

const COMMON_SNOOZE_TIMES: Array<[number, string, string]> = [
  [1, 'h', i18n.translate('xpack.responseOpsAlertsTable.snooze.1h', { defaultMessage: '1 hour' })],
  [3, 'h', i18n.translate('xpack.responseOpsAlertsTable.snooze.3h', { defaultMessage: '3 hours' })],
  [8, 'h', i18n.translate('xpack.responseOpsAlertsTable.snooze.8h', { defaultMessage: '8 hours' })],
  [1, 'd', i18n.translate('xpack.responseOpsAlertsTable.snooze.1d', { defaultMessage: '1 day' })],
];

const SEVERITY_OPTIONS = [
  {
    value: 'critical',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.severity.critical', {
      defaultMessage: 'Critical',
    }),
  },
  {
    value: 'high',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.severity.high', {
      defaultMessage: 'High',
    }),
  },
  {
    value: 'medium',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.severity.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    value: 'low',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.severity.low', {
      defaultMessage: 'Low',
    }),
  },
];

const DURATION_UNIT_OPTIONS = [
  {
    value: 'm',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.unit.minutes', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.unit.hours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.unit.days', {
      defaultMessage: 'days',
    }),
  },
  {
    value: 'w',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.unit.weeks', {
      defaultMessage: 'weeks',
    }),
  },
];

interface AlertSnoozePopoverProps {
  /** Whether the popover is open */
  isOpen: boolean;
  /** Close the popover */
  onClose: () => void;
  /** The button that opens the popover */
  button: React.ReactElement;
  /** Called when the user applies a snooze. Passes the API-ready params. */
  onApplySnooze: (params: {
    expiresAt?: string;
    conditions?: MuteCondition[];
    conditionOperator?: 'any' | 'all';
  }) => Promise<void>;
  /** Current severity value of the alert (for snapshotting) */
  currentSeverity?: string;
  /** Current alert data (record of field name to array of values) for field_change snapshot */
  alertData?: Record<string, string[]>;
}

/**
 * Popover for configuring per-alert conditional snooze/mute.
 * Supports quick snooze (time-based), indefinite mute, severity conditions,
 * and compound conditions (e.g. severity change OR time expiry).
 */
export const AlertSnoozePopover: React.FC<AlertSnoozePopoverProps> = ({
  isOpen,
  onClose,
  button,
  onApplySnooze,
  currentSeverity,
  alertData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [customValue, setCustomValue] = useState(1);
  const [customUnit, setCustomUnit] = useState('h');
  const [absoluteDate, setAbsoluteDate] = useState<Moment | null>(null);
  const [useAbsoluteTime, setUseAbsoluteTime] = useState(false);

  // Condition checkboxes
  const [untilSeverityChanges, setUntilSeverityChanges] = useState(false);
  const [untilSeverityEquals, setUntilSeverityEquals] = useState(false);
  const [targetSeverity, setTargetSeverity] = useState('critical');
  const [untilFieldChanges, setUntilFieldChanges] = useState(false);
  const [watchedFieldName, setWatchedFieldName] = useState('');
  const [withTimeBound, setWithTimeBound] = useState(false);
  const [conditionOperator, setConditionOperator] = useState<'any' | 'all'>('any');

  // Generated IDs for checkbox accessibility (M1)
  const severityChangesCheckboxId = useGeneratedHtmlId({
    prefix: 'snoozeUntilSeverityChanges',
  });
  const severityEqualsCheckboxId = useGeneratedHtmlId({
    prefix: 'snoozeUntilSeverityEquals',
  });
  const fieldChangeCheckboxId = useGeneratedHtmlId({
    prefix: 'snoozeUntilFieldChanges',
  });
  const timeBoundCheckboxId = useGeneratedHtmlId({
    prefix: 'snoozeWithTimeBound',
  });

  const hasConditions = untilSeverityChanges || untilSeverityEquals || (untilFieldChanges && watchedFieldName.trim().length > 0);
  const hasMultipleConditions =
    [untilSeverityChanges, untilSeverityEquals, untilFieldChanges && watchedFieldName.trim().length > 0].filter(Boolean).length > 1 ||
    (hasConditions && withTimeBound);

  const buildConditions = useCallback((): MuteCondition[] => {
    const conditions: MuteCondition[] = [];
    if (untilSeverityChanges) {
      conditions.push({
        type: 'severity_change',
        field: 'kibana.alert.severity',
        snapshotValue: currentSeverity,
      });
    }
    if (untilSeverityEquals) {
      conditions.push({
        type: 'severity_equals',
        field: 'kibana.alert.severity',
        value: targetSeverity,
      });
    }
    if (untilFieldChanges && watchedFieldName.trim().length > 0) {
      const fieldName = watchedFieldName.trim();
      const snapshotValue = alertData?.[fieldName]?.[0];
      conditions.push({
        type: 'field_change',
        field: fieldName,
        ...(snapshotValue != null ? { snapshotValue } : {}),
      });
    }
    return conditions;
  }, [alertData, currentSeverity, targetSeverity, untilFieldChanges, untilSeverityChanges, untilSeverityEquals, watchedFieldName]);

  const applyQuickSnooze = useCallback(
    async (value: number, unit: string) => {
      setIsLoading(true);
      try {
        const expiresAt = moment()
          .add(value, unit as moment.unitOfTime.DurationConstructor)
          .toISOString();
        const conditions = buildConditions();

        await onApplySnooze({
          expiresAt,
          ...(conditions.length > 0 ? { conditions, conditionOperator } : {}),
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    },
    [buildConditions, conditionOperator, onApplySnooze, onClose]
  );

  const applyIndefinite = useCallback(async () => {
    setIsLoading(true);
    try {
      const conditions = buildConditions();

      await onApplySnooze({
        ...(conditions.length > 0 ? { conditions, conditionOperator } : {}),
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [buildConditions, conditionOperator, onApplySnooze, onClose]);

  const applyCustom = useCallback(async () => {
    if (useAbsoluteTime && absoluteDate) {
      setIsLoading(true);
      try {
        const conditions = buildConditions();
        await onApplySnooze({
          expiresAt: absoluteDate.toISOString(),
          ...(conditions.length > 0 ? { conditions, conditionOperator } : {}),
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    } else {
      await applyQuickSnooze(customValue, customUnit);
    }
  }, [absoluteDate, applyQuickSnooze, buildConditions, conditionOperator, customUnit, customValue, onApplySnooze, onClose, useAbsoluteTime]);

  const applyConditionsOnly = useCallback(async () => {
    setIsLoading(true);
    try {
      const conditions = buildConditions();

      let expiresAt: string | undefined;
      if (withTimeBound) {
        if (useAbsoluteTime && absoluteDate) {
          expiresAt = absoluteDate.toISOString();
        } else {
          expiresAt = moment()
            .add(customValue, customUnit as moment.unitOfTime.DurationConstructor)
            .toISOString();
        }
      }

      await onApplySnooze({
        ...(expiresAt ? { expiresAt } : {}),
        ...(conditions.length > 0 ? { conditions, conditionOperator } : {}),
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [absoluteDate, buildConditions, conditionOperator, customUnit, customValue, onApplySnooze, onClose, useAbsoluteTime, withTimeBound]);

  // M5: Radio group options for condition operator
  const conditionOperatorOptions = useMemo(
    () => [
      {
        id: 'condition-operator-any',
        label: i18n.translate('xpack.responseOpsAlertsTable.snooze.conditionOperator.any', {
          defaultMessage: 'Any condition (OR)',
        }),
      },
      {
        id: 'condition-operator-all',
        label: i18n.translate('xpack.responseOpsAlertsTable.snooze.conditionOperator.all', {
          defaultMessage: 'All conditions (AND)',
        }),
      },
    ],
    []
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={onClose}
      button={button}
      panelPaddingSize="m"
      anchorPosition="downLeft"
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.responseOpsAlertsTable.snooze.title', {
          defaultMessage: 'Snooze alert notifications',
        })}
      </EuiPopoverTitle>

      <div css={popoverContentCss}>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.description', {
            defaultMessage:
              'Suppress actions for this alert for a period or until conditions are met.',
          })}
        </EuiText>

        <EuiSpacer size="m" />

        {/* Quick snooze buttons */}
        <EuiTitle size="xxxs">
          <h5>
            {i18n.translate('xpack.responseOpsAlertsTable.snooze.quickSnooze', {
              defaultMessage: 'Quick snooze',
            })}
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" wrap>
          {COMMON_SNOOZE_TIMES.map(([value, unit, label]) => (
            <EuiFlexItem key={`${value}${unit}`} grow={false}>
              <EuiLink
                data-test-subj={`alert-snooze-${value}${unit}`}
                onClick={() => applyQuickSnooze(value, unit)}
              >
                {label}
              </EuiLink>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiLink data-test-subj="alert-snooze-indefinite" onClick={applyIndefinite}>
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.indefinitely', {
            defaultMessage: 'Snooze indefinitely',
          })}
        </EuiLink>

        <EuiHorizontalRule margin="m" />

        {/* Conditions section */}
        <EuiTitle size="xxxs">
          <h5>
            {i18n.translate('xpack.responseOpsAlertsTable.snooze.conditions', {
              defaultMessage: 'Conditions (unmute when met)',
            })}
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiCheckbox
          id={severityChangesCheckboxId}
          label={i18n.translate('xpack.responseOpsAlertsTable.snooze.untilSeverityChanges', {
            defaultMessage: 'Until severity changes',
          })}
          checked={untilSeverityChanges}
          onChange={(e) => setUntilSeverityChanges(e.target.checked)}
        />

        <EuiSpacer size="s" />

        <EuiCheckbox
          id={severityEqualsCheckboxId}
          label={i18n.translate('xpack.responseOpsAlertsTable.snooze.untilSeverityReaches', {
            defaultMessage: 'Until severity reaches',
          })}
          checked={untilSeverityEquals}
          onChange={(e) => setUntilSeverityEquals(e.target.checked)}
        />
        {untilSeverityEquals && (
          <>
            <EuiSpacer size="xs" />
            <EuiSelect
              compressed
              options={SEVERITY_OPTIONS}
              value={targetSeverity}
              onChange={(e) => setTargetSeverity(e.target.value)}
              data-test-subj="snooze-target-severity"
            />
          </>
        )}

        <EuiSpacer size="s" />

        <EuiCheckbox
          id={fieldChangeCheckboxId}
          label={i18n.translate('xpack.responseOpsAlertsTable.snooze.untilFieldChanges', {
            defaultMessage: 'Until a field value changes',
          })}
          checked={untilFieldChanges}
          onChange={(e) => setUntilFieldChanges(e.target.checked)}
        />
        {untilFieldChanges && (
          <>
            <EuiSpacer size="xs" />
            <EuiFieldText
              compressed
              placeholder={i18n.translate(
                'xpack.responseOpsAlertsTable.snooze.fieldNamePlaceholder',
                { defaultMessage: 'Field name (e.g. host.name)' }
              )}
              value={watchedFieldName}
              onChange={(e) => setWatchedFieldName(e.target.value)}
              data-test-subj="snooze-field-name"
            />
            {watchedFieldName.trim().length > 0 && alertData?.[watchedFieldName.trim()] && (
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.responseOpsAlertsTable.snooze.currentFieldValue', {
                  defaultMessage: 'Current value: {value}',
                  values: { value: alertData[watchedFieldName.trim()][0] ?? 'N/A' },
                })}
              </EuiText>
            )}
          </>
        )}

        <EuiSpacer size="s" />

        <EuiCheckbox
          id={timeBoundCheckboxId}
          label={i18n.translate('xpack.responseOpsAlertsTable.snooze.orAfterDuration', {
            defaultMessage: 'OR after a time period',
          })}
          checked={withTimeBound}
          onChange={(e) => setWithTimeBound(e.target.checked)}
        />
        {withTimeBound && (
          <>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="snooze-condition-toggle-relative"
                  color={!useAbsoluteTime ? 'primary' : 'subdued'}
                  onClick={() => setUseAbsoluteTime(false)}
                >
                  {i18n.translate('xpack.responseOpsAlertsTable.snooze.condRelative', {
                    defaultMessage: 'Relative',
                  })}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">|</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="snooze-condition-toggle-absolute"
                  color={useAbsoluteTime ? 'primary' : 'subdued'}
                  onClick={() => setUseAbsoluteTime(true)}
                >
                  {i18n.translate('xpack.responseOpsAlertsTable.snooze.condAbsolute', {
                    defaultMessage: 'Date/Time',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            {!useAbsoluteTime ? (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiFormRow>
                    <EuiFieldNumber
                      compressed
                      min={1}
                      value={customValue}
                      onChange={(e) => setCustomValue(Number(e.target.value))}
                      css={css`
                        width: 60px;
                      `}
                      data-test-subj="snooze-custom-value"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow>
                    <EuiSelect
                      compressed
                      options={DURATION_UNIT_OPTIONS}
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      data-test-subj="snooze-custom-unit"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiDatePicker
                selected={absoluteDate}
                onChange={(date) => setAbsoluteDate(date)}
                showTimeSelect
                minDate={moment()}
                dateFormat="YYYY-MM-DD HH:mm"
                timeFormat="HH:mm"
                data-test-subj="snooze-condition-absolute-date"
              />
            )}
          </>
        )}

        {/* M5: Condition operator selector (AND/OR) shown when multiple conditions selected */}
        {hasMultipleConditions && (
          <>
            <EuiSpacer size="m" />
            <EuiRadioGroup
              options={conditionOperatorOptions}
              idSelected={`condition-operator-${conditionOperator}`}
              onChange={(optionId) =>
                setConditionOperator(optionId === 'condition-operator-all' ? 'all' : 'any')
              }
              data-test-subj="snooze-condition-operator"
              legend={{
                children: i18n.translate(
                  'xpack.responseOpsAlertsTable.snooze.conditionOperatorLegend',
                  { defaultMessage: 'Condition logic' }
                ),
                display: 'hidden',
              }}
            />
          </>
        )}

        {hasConditions && (
          <>
            <EuiSpacer size="m" />
            <EuiButton
              fullWidth
              size="s"
              isLoading={isLoading}
              onClick={applyConditionsOnly}
              data-test-subj="alert-snooze-apply-conditions"
            >
              {i18n.translate('xpack.responseOpsAlertsTable.snooze.applyConditions', {
                defaultMessage: 'Apply snooze with conditions',
              })}
            </EuiButton>
          </>
        )}

        {!hasConditions && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiTitle size="xxxs">
              <h5>
                {i18n.translate('xpack.responseOpsAlertsTable.snooze.customDuration', {
                  defaultMessage: 'Custom duration',
                })}
              </h5>
            </EuiTitle>
            <EuiSpacer size="s" />

            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="snooze-toggle-relative"
                  color={!useAbsoluteTime ? 'primary' : 'subdued'}
                  onClick={() => setUseAbsoluteTime(false)}
                >
                  {i18n.translate('xpack.responseOpsAlertsTable.snooze.relative', {
                    defaultMessage: 'Relative',
                  })}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">|</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="snooze-toggle-absolute"
                  color={useAbsoluteTime ? 'primary' : 'subdued'}
                  onClick={() => setUseAbsoluteTime(true)}
                >
                  {i18n.translate('xpack.responseOpsAlertsTable.snooze.absolute', {
                    defaultMessage: 'Date/Time',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            {!useAbsoluteTime ? (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiFieldNumber
                    compressed
                    min={1}
                    value={customValue}
                    onChange={(e) => setCustomValue(Number(e.target.value))}
                    css={css`
                      width: 60px;
                    `}
                    data-test-subj="snooze-custom-value-simple"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    compressed
                    options={DURATION_UNIT_OPTIONS}
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    data-test-subj="snooze-custom-unit-simple"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    isLoading={isLoading}
                    onClick={applyCustom}
                    data-test-subj="alert-snooze-apply-custom"
                  >
                    {i18n.translate('xpack.responseOpsAlertsTable.snooze.apply', {
                      defaultMessage: 'Apply',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup gutterSize="s" alignItems="center" direction="column">
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('xpack.responseOpsAlertsTable.snooze.snoozeUntil', {
                      defaultMessage: 'Snooze until',
                    })}
                    fullWidth
                  >
                    <EuiDatePicker
                      selected={absoluteDate}
                      onChange={(date) => setAbsoluteDate(date)}
                      showTimeSelect
                      minDate={moment()}
                      dateFormat="YYYY-MM-DD HH:mm"
                      timeFormat="HH:mm"
                      data-test-subj="snooze-absolute-date"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    size="s"
                    isLoading={isLoading}
                    disabled={!absoluteDate || absoluteDate.isBefore(moment())}
                    onClick={applyCustom}
                    data-test-subj="alert-snooze-apply-absolute"
                    fullWidth
                  >
                    {i18n.translate('xpack.responseOpsAlertsTable.snooze.applyAbsolute', {
                      defaultMessage: 'Snooze until date',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </>
        )}

        <EuiSpacer size="s" />
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={onClose}
          data-test-subj="alert-snooze-cancel"
        >
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </div>
    </EuiPopover>
  );
};
