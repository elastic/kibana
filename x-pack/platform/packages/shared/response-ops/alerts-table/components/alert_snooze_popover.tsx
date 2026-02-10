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
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type { MuteCondition } from '@kbn/alerting-types';

const COMMON_SNOOZE_TIMES: Array<[number, string, string]> = [
  [1, 'h', i18n.translate('xpack.responseOpsAlertsTable.snooze.1h', { defaultMessage: '1 hour' })],
  [3, 'h', i18n.translate('xpack.responseOpsAlertsTable.snooze.3h', { defaultMessage: '3 hours' })],
  [8, 'h', i18n.translate('xpack.responseOpsAlertsTable.snooze.8h', { defaultMessage: '8 hours' })],
  [1, 'd', i18n.translate('xpack.responseOpsAlertsTable.snooze.1d', { defaultMessage: '1 day' })],
];

const SEVERITY_OPTIONS = [
  { value: 'critical', text: 'Critical' },
  { value: 'high', text: 'High' },
  { value: 'medium', text: 'Medium' },
  { value: 'low', text: 'Low' },
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
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [customValue, setCustomValue] = useState(1);
  const [customUnit, setCustomUnit] = useState('h');

  // Condition checkboxes
  const [untilSeverityChanges, setUntilSeverityChanges] = useState(false);
  const [untilSeverityEquals, setUntilSeverityEquals] = useState(false);
  const [targetSeverity, setTargetSeverity] = useState('critical');
  const [withTimeBound, setWithTimeBound] = useState(false);

  const applyQuickSnooze = useCallback(
    async (value: number, unit: string) => {
      setIsLoading(true);
      try {
        const expiresAt = moment().add(value, unit as moment.unitOfTime.DurationConstructor).toISOString();
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

        await onApplySnooze({
          expiresAt,
          ...(conditions.length > 0 ? { conditions, conditionOperator: 'any' } : {}),
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    },
    [currentSeverity, onApplySnooze, onClose, targetSeverity, untilSeverityChanges, untilSeverityEquals]
  );

  const applyIndefinite = useCallback(async () => {
    setIsLoading(true);
    try {
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

      await onApplySnooze({
        ...(conditions.length > 0 ? { conditions, conditionOperator: 'any' } : {}),
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [currentSeverity, onApplySnooze, onClose, targetSeverity, untilSeverityChanges, untilSeverityEquals]);

  const applyCustom = useCallback(async () => {
    await applyQuickSnooze(customValue, customUnit);
  }, [applyQuickSnooze, customUnit, customValue]);

  const applyConditionsOnly = useCallback(async () => {
    setIsLoading(true);
    try {
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

      const expiresAt = withTimeBound
        ? moment().add(customValue, customUnit as moment.unitOfTime.DurationConstructor).toISOString()
        : undefined;

      await onApplySnooze({
        ...(expiresAt ? { expiresAt } : {}),
        ...(conditions.length > 0 ? { conditions, conditionOperator: 'any' } : {}),
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSeverity,
    customUnit,
    customValue,
    onApplySnooze,
    onClose,
    targetSeverity,
    untilSeverityChanges,
    untilSeverityEquals,
    withTimeBound,
  ]);

  const hasConditions = untilSeverityChanges || untilSeverityEquals;

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

      <div style={{ width: 340 }}>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.description', {
            defaultMessage: 'Suppress actions for this alert for a period or until conditions are met.',
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
        <EuiLink
          data-test-subj="alert-snooze-indefinite"
          onClick={applyIndefinite}
        >
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
          id="snooze-until-severity-changes"
          label={i18n.translate('xpack.responseOpsAlertsTable.snooze.untilSeverityChanges', {
            defaultMessage: 'Until severity changes',
          })}
          checked={untilSeverityChanges}
          onChange={(e) => setUntilSeverityChanges(e.target.checked)}
        />

        <EuiSpacer size="s" />

        <EuiCheckbox
          id="snooze-until-severity-equals"
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
          id="snooze-with-time-bound"
          label={i18n.translate('xpack.responseOpsAlertsTable.snooze.orAfterDuration', {
            defaultMessage: 'OR after a time period',
          })}
          checked={withTimeBound}
          onChange={(e) => setWithTimeBound(e.target.checked)}
        />
        {withTimeBound && (
          <>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiFormRow>
                  <EuiFieldNumber
                    compressed
                    min={1}
                    value={customValue}
                    onChange={(e) => setCustomValue(Number(e.target.value))}
                    style={{ width: 60 }}
                    data-test-subj="snooze-custom-value"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow>
                  <EuiSelect
                    compressed
                    options={[
                      { value: 'm', text: 'minutes' },
                      { value: 'h', text: 'hours' },
                      { value: 'd', text: 'days' },
                      { value: 'w', text: 'weeks' },
                    ]}
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    data-test-subj="snooze-custom-unit"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
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
                <EuiFieldNumber
                  compressed
                  min={1}
                  value={customValue}
                  onChange={(e) => setCustomValue(Number(e.target.value))}
                  style={{ width: 60 }}
                  data-test-subj="snooze-custom-value-simple"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  options={[
                    { value: 'm', text: 'minutes' },
                    { value: 'h', text: 'hours' },
                    { value: 'd', text: 'days' },
                    { value: 'w', text: 'weeks' },
                  ]}
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
