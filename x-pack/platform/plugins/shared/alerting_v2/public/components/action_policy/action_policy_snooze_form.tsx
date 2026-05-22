/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

export type DurationUnit = 'm' | 'h' | 'd';

export const computeSnoozedUntil = (value: number, unit: DurationUnit): string => {
  const ms: Record<DurationUnit, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + value * ms[unit]).toISOString();
};

export const UNIT_OPTIONS: Array<{ value: DurationUnit; text: string }> = [
  {
    value: 'm',
    text: i18n.translate('xpack.alertingV2.actionPolicy.snooze.minutes', {
      defaultMessage: 'Minutes',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.alertingV2.actionPolicy.snooze.hours', {
      defaultMessage: 'Hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.alertingV2.actionPolicy.snooze.days', {
      defaultMessage: 'Days',
    }),
  },
];

export const COMMON_SNOOZE_TIMES: Array<{ label: string; value: number; unit: DurationUnit }> = [
  {
    label: i18n.translate('xpack.alertingV2.actionPolicy.snooze.preset.1h', {
      defaultMessage: '1 hour',
    }),
    value: 1,
    unit: 'h',
  },
  {
    label: i18n.translate('xpack.alertingV2.actionPolicy.snooze.preset.3h', {
      defaultMessage: '3 hours',
    }),
    value: 3,
    unit: 'h',
  },
  {
    label: i18n.translate('xpack.alertingV2.actionPolicy.snooze.preset.8h', {
      defaultMessage: '8 hours',
    }),
    value: 8,
    unit: 'h',
  },
  {
    label: i18n.translate('xpack.alertingV2.actionPolicy.snooze.preset.1d', {
      defaultMessage: '1 day',
    }),
    value: 1,
    unit: 'd',
  },
];

export const formatSnoozeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const formatSnoozeFullDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

interface ActionPolicySnoozeFormProps {
  isSnoozed: boolean;
  onApplySnooze: (snoozedUntil: string) => void;
  onCancelSnooze: () => void;
}

export const ActionPolicySnoozeForm = ({
  isSnoozed,
  onApplySnooze,
  onCancelSnooze,
}: ActionPolicySnoozeFormProps) => {
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('h');

  const applySnooze = (value: number, unit: DurationUnit) => {
    onApplySnooze(computeSnoozedUntil(value, unit));
  };

  return (
    <>
      <EuiTitle size="xxxs">
        <h4>
          {i18n.translate('xpack.alertingV2.actionPolicy.snooze.title', {
            defaultMessage: 'Snooze notifications',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false} style={{ width: 80 }}>
          <EuiFieldNumber
            min={1}
            value={durationValue}
            onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
            compressed
            aria-label={i18n.translate(
              'xpack.alertingV2.actionPolicy.snooze.durationValueAriaLabel',
              { defaultMessage: 'Snooze duration value' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 120 }}>
          <EuiSelect
            options={UNIT_OPTIONS}
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
            compressed
            aria-label={i18n.translate('xpack.alertingV2.actionPolicy.snooze.unitSelectAriaLabel', {
              defaultMessage: 'Snooze duration unit',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => applySnooze(durationValue, durationUnit)}>
            {i18n.translate('xpack.alertingV2.actionPolicy.snooze.apply', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertingV2.actionPolicy.snooze.commonlyUsed', {
          defaultMessage: 'Commonly used',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween" wrap>
        {COMMON_SNOOZE_TIMES.map((preset) => (
          <EuiFlexItem key={preset.label} grow={false} style={{ width: '45%' }}>
            <EuiLink onClick={() => applySnooze(preset.value, preset.unit)}>{preset.label}</EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {isSnoozed && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiButton size="s" color="danger" onClick={onCancelSnooze} fullWidth>
            {i18n.translate('xpack.alertingV2.actionPolicy.snooze.cancel', {
              defaultMessage: 'Cancel snooze',
            })}
          </EuiButton>
        </>
      )}
    </>
  );
};
