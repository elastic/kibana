/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRadio } from '@elastic/eui';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { useController } from 'react-hook-form';

import type { ScheduleType } from '../../../common/schedule';

const StyledEuiCard = styled(EuiCard)`
  padding: 16px 92px 16px 16px !important;
  border: ${({ theme, selectable }) => {
    if (selectable?.isSelected) {
      return `${theme.euiTheme.border.width.thin} solid ${theme.euiTheme.colors.success}`;
    }
  }};

  .euiTitle {
    font-size: 1rem;
  }

  .euiSpacer {
    display: none;
  }

  .euiText {
    margin-top: 0;
    margin-left: 25px;
    color: ${({ theme }) => theme.euiTheme.colors.subduedText};
  }

  > button[role='switch'] {
    display: none;
  }
`;

interface ScheduleTypeSelectorProps {
  isDisabled?: boolean;
  /**
   * When true, both cards render as disabled and the value cannot be changed
   * via the UI. Used by per-query overrides to enforce the pack-level mode
   * (D11) — the parent ScheduleSection sets `schedule_type` programmatically.
   */
  isTypeLocked?: boolean;
}

const ScheduleTypeSelectorComponent: React.FC<ScheduleTypeSelectorProps> = ({
  isDisabled = false,
  isTypeLocked = false,
}) => {
  const {
    field: { value, onChange },
  } = useController<{ schedule_type: ScheduleType }, 'schedule_type'>({
    name: 'schedule_type',
    defaultValue: 'interval',
  });

  const cardsDisabled = isDisabled || isTypeLocked;

  const handleChange = useCallback(
    (next: ScheduleType) => {
      if (cardsDisabled || next === value) {
        return;
      }

      onChange(next);
    },
    [cardsDisabled, onChange, value]
  );

  const intervalCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('interval'),
      isSelected: value === 'interval',
      isDisabled: cardsDisabled,
    }),
    [handleChange, cardsDisabled, value]
  );

  const rruleCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('rrule'),
      isSelected: value === 'rrule',
      isDisabled: cardsDisabled,
    }),
    [handleChange, cardsDisabled, value]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.scheduleSection.typeSelector.label', {
        defaultMessage: 'Schedule',
      })}
      fullWidth
    >
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <StyledEuiCard
            layout="horizontal"
            title={
              <EuiRadio
                id="osquery_schedule_type_interval"
                name="schedule_type"
                label={i18n.translate('xpack.osquery.scheduleSection.typeSelector.intervalLabel', {
                  defaultMessage: 'Interval',
                })}
                checked={value === 'interval'}
                disabled={cardsDisabled}
                onChange={noop}
              />
            }
            titleSize="xs"
            hasBorder
            description={i18n.translate(
              'xpack.osquery.scheduleSection.typeSelector.intervalDescription',
              {
                defaultMessage:
                  'Run queries based on specified time intervals, calculated from when each agent was deployed.',
              }
            )}
            data-test-subj="osquery-schedule-type-interval"
            selectable={intervalCardSelectable}
            {...(value === 'interval' && { color: 'primary' })}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StyledEuiCard
            layout="horizontal"
            title={
              <EuiRadio
                id="osquery_schedule_type_rrule"
                name="schedule_type"
                label={i18n.translate('xpack.osquery.scheduleSection.typeSelector.rruleLabel', {
                  defaultMessage: 'Date & time',
                })}
                checked={value === 'rrule'}
                disabled={cardsDisabled}
                onChange={noop}
              />
            }
            titleSize="xs"
            hasBorder
            description={i18n.translate(
              'xpack.osquery.scheduleSection.typeSelector.rruleDescription',
              {
                defaultMessage:
                  'Run queries at a set date and time, such as every Saturday at 9am.',
              }
            )}
            data-test-subj="osquery-schedule-type-rrule"
            selectable={rruleCardSelectable}
            {...(value === 'rrule' && { color: 'primary' })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

export const ScheduleTypeSelector = React.memo(ScheduleTypeSelectorComponent);
