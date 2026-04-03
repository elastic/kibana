/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

type DurationUnit = 's' | 'm' | 'h' | 'd';

const DURATION_UNIT_OPTIONS: Array<{ value: DurationUnit; text: string }> = [
  {
    value: 's',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationInput.seconds', {
      defaultMessage: 'second(s)',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationInput.minutes', {
      defaultMessage: 'minute(s)',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationInput.hours', {
      defaultMessage: 'hour(s)',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.alertingV2.notificationPolicy.form.durationInput.days', {
      defaultMessage: 'day(s)',
    }),
  },
];

const VALID_UNITS: ReadonlySet<DurationUnit> = new Set(['s', 'm', 'h', 'd']);

const isDurationUnit = (c: string): c is DurationUnit => VALID_UNITS.has(c as DurationUnit);

const parseDuration = (raw: string): { value: number | ''; unit: DurationUnit } => {
  if (!raw) return { value: '', unit: 'm' };

  const lastChar = raw.charAt(raw.length - 1);
  const unit = isDurationUnit(lastChar) ? lastChar : 'm';
  const parsed = parseInt(raw, 10);

  return { value: Number.isNaN(parsed) ? '' : parsed, unit };
};

interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  isInvalid?: boolean;
  'data-test-subj'?: string;
}

export function DurationInput({
  value,
  onChange,
  isInvalid,
  'data-test-subj': dataTestSubj,
}: DurationInputProps) {
  const [durationValue, setDurationValue] = useState<number | ''>(() => parseDuration(value).value);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(() => parseDuration(value).unit);

  useEffect(() => {
    const parsed = parseDuration(value);
    setDurationValue(parsed.value);
    setDurationUnit(parsed.unit);
  }, [value]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setDurationValue('');
      onChange('');
      return;
    }

    const num = parseInt(raw, 10);
    if (!Number.isNaN(num)) {
      setDurationValue(num);
      if (num > 0) {
        onChange(`${num}${durationUnit}`);
      }
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as DurationUnit;
    setDurationUnit(newUnit);
    if (typeof durationValue === 'number' && durationValue > 0) {
      onChange(`${durationValue}${newUnit}`);
    }
  };

  return (
    <EuiFieldNumber
      prepend={i18n.translate('xpack.alertingV2.notificationPolicy.form.durationInput.every', {
        defaultMessage: 'Every',
      })}
      append={
        <EuiSelect
          options={DURATION_UNIT_OPTIONS}
          value={durationUnit}
          onChange={handleUnitChange}
          compressed
          aria-label={i18n.translate(
            'xpack.alertingV2.notificationPolicy.form.durationInput.unitAriaLabel',
            { defaultMessage: 'Duration unit' }
          )}
          data-test-subj="durationUnitSelect"
        />
      }
      min={1}
      value={durationValue}
      onChange={handleValueChange}
      fullWidth
      isInvalid={isInvalid}
      data-test-subj={dataTestSubj ?? 'durationValueInput'}
    />
  );
}
