/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFieldNumber,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

const unitOptions = [
  {
    value: 's',
    text: i18n.translate('xpack.runningQueries.runTimeFilter.seconds', {
      defaultMessage: 'seconds ago',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.runningQueries.runTimeFilter.minutes', {
      defaultMessage: 'minutes ago',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.runningQueries.runTimeFilter.hours', {
      defaultMessage: 'hours ago',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.runningQueries.runTimeFilter.days', {
      defaultMessage: 'days ago',
    }),
  },
  {
    value: 'w',
    text: i18n.translate('xpack.runningQueries.runTimeFilter.weeks', {
      defaultMessage: 'weeks ago',
    }),
  },
  {
    value: 'M',
    text: i18n.translate('xpack.runningQueries.runTimeFilter.months', {
      defaultMessage: 'months ago',
    }),
  },
  {
    value: 'y',
    text: i18n.translate('xpack.runningQueries.runTimeFilter.years', {
      defaultMessage: 'years ago',
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

  const hasValue = value !== null;

  const buttonLabel = i18n.translate('xpack.runningQueries.runTimeFilter.label', {
    defaultMessage: 'Run time',
  });

  const startDate = useMemo(
    () =>
      hasValue
        ? moment()
            .subtract(value, unit as moment.unitOfTime.DurationConstructor)
            .format('MMM D, YYYY @ HH:mm:ss.SSS')
        : null,
    [hasValue, value, unit]
  );

  return (
    <EuiPopover
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          hasActiveFilters={hasValue}
          numActiveFilters={hasValue ? 1 : 0}
          onClick={() => setIsOpen(!isOpen)}
          withNext
        >
          {buttonLabel}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
    >
      <div style={{ width: 280 }}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 80 }}>
            <EuiFieldNumber
              compressed
              min={1}
              placeholder="0"
              value={value ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange(null, unit);
                  return;
                }
                const num = parseInt(raw, 10);
                if (!Number.isNaN(num) && num >= 1) {
                  onChange(num, unit);
                }
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              compressed
              options={unitOptions}
              value={unit}
              onChange={(e) => onChange(value, e.target.value)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiPanel color="subdued" paddingSize="s" hasBorder>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <strong>
                  {i18n.translate('xpack.runningQueries.runTimeFilter.startDateLabel', {
                    defaultMessage: 'Start date',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color={hasValue ? 'default' : 'subdued'}>
                {startDate ?? '—'}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiHorizontalRule margin="s" />

        <EuiButton
          size="s"
          iconType="cross"
          isDisabled={!hasValue}
          fullWidth
          color="text"
          onClick={() => {
            onChange(null, unit);
          }}
        >
          {i18n.translate('xpack.runningQueries.runTimeFilter.clearFilter', {
            defaultMessage: 'Clear filter',
          })}
        </EuiButton>
      </div>
    </EuiPopover>
  );
};
