/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const unitOptions = [
  {
    value: 's',
    text: i18n.translate('xpack.queryActivity.runTimeFilter.seconds', {
      defaultMessage: 'seconds',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.queryActivity.runTimeFilter.minutes', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.queryActivity.runTimeFilter.hours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.queryActivity.runTimeFilter.days', {
      defaultMessage: 'days',
    }),
  },
  {
    value: 'w',
    text: i18n.translate('xpack.queryActivity.runTimeFilter.weeks', {
      defaultMessage: 'weeks',
    }),
  },
  {
    value: 'M',
    text: i18n.translate('xpack.queryActivity.runTimeFilter.months', {
      defaultMessage: 'months',
    }),
  },
  {
    value: 'y',
    text: i18n.translate('xpack.queryActivity.runTimeFilter.years', {
      defaultMessage: 'years',
    }),
  },
];

interface RunTimeFilterProps {
  value: number | null;
  unit: string;
  onChange: (value: number | null, unit: string) => void;
}

export const RunTimeFilter: React.FC<RunTimeFilterProps> = ({ value, unit, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<number | null>(value);
  const [draftUnit, setDraftUnit] = useState(unit);

  useEffect(() => {
    if (isOpen) {
      setDraftValue(value);
      setDraftUnit(unit);
    }
  }, [isOpen, value, unit]);

  const hasActiveFilter = value !== null;
  const hasDraftValue = draftValue !== null;

  const buttonLabel = i18n.translate('xpack.queryActivity.runTimeFilter.label', {
    defaultMessage: 'Run time',
  });

  const closePopover = useCallback(() => {
    onChange(draftValue, draftUnit);
    setIsOpen(false);
  }, [draftValue, draftUnit, onChange]);

  const handleClear = useCallback(() => {
    onChange(null, draftUnit);
    setDraftValue(null);
    setIsOpen(false);
  }, [draftUnit, onChange]);

  return (
    <EuiPopover
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          hasActiveFilters={hasActiveFilter}
          numActiveFilters={hasActiveFilter ? 1 : undefined}
          onClick={() => setIsOpen(!isOpen)}
          withNext
        >
          {buttonLabel}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      panelStyle={{ width: 280 }}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false} style={{ width: 80 }}>
          <EuiFieldNumber
            compressed
            min={1}
            placeholder="0"
            value={draftValue ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                setDraftValue(null);
                return;
              }
              const num = parseInt(raw, 10);
              if (!Number.isNaN(num) && num >= 1) {
                setDraftValue(num);
              }
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            compressed
            options={unitOptions}
            value={draftUnit}
            aria-label={i18n.translate('xpack.queryActivity.runTimeFilter.unitSelectAriaLabel', {
              defaultMessage: 'Run time unit',
            })}
            onChange={(e) => setDraftUnit(e.target.value)}
          />
        </EuiFlexItem>
        {hasDraftValue && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="primary"
              size="s"
              aria-label={i18n.translate('xpack.queryActivity.runTimeFilter.clearFilter', {
                defaultMessage: 'Clear filter',
              })}
              onClick={handleClear}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopover>
  );
};
