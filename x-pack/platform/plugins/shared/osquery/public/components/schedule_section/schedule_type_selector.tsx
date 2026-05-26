/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRadio,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { noop } from 'lodash';
import styled from '@emotion/styled';
import type { ScheduleType } from '../../../common/schedule';
import {
  SCHEDULE_TYPE_INTERVAL_DESCRIPTION,
  SCHEDULE_TYPE_INTERVAL_LABEL,
  SCHEDULE_TYPE_LABEL,
  SCHEDULE_TYPE_LOCKED_HELP,
  SCHEDULE_TYPE_RECURRENCE_DESCRIPTION,
  SCHEDULE_TYPE_RECURRENCE_LABEL,
} from './translations';

const StyledEuiCard = styled(EuiCard, {
  shouldForwardProp: (prop) => prop !== 'isInteractive',
})<{ isInteractive?: boolean }>`
  padding: 16px 92px 16px 16px !important;
  border: ${({ theme, selectable }) => {
    if (selectable?.isSelected) {
      return `${theme.euiTheme.border.width.thin} solid ${theme.euiTheme.colors.success}`;
    }
  }};

  ${({ isInteractive }) =>
    isInteractive === false
      ? `
        cursor: not-allowed;
        & * {
          pointer-events: none;
        }
      `
      : ''}

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

export interface ScheduleTypeSelectorProps {
  value: ScheduleType;
  onChange: (value: ScheduleType) => void;
  /**
   * When set, the selector locks to the given mode. Used by the QueryFlyout
   * to enforce the same-mode constraint (D11) — per-query overrides cannot
   * change the pack's schedule mode, only its details.
   */
  lockedScheduleType?: ScheduleType;
  disabled?: boolean;
  /**
   * Optional override for the generated id prefix. Tests pin this to keep
   * radio ids stable across renders. In product code an auto-generated
   * instance-scoped prefix is used (see {@link useGeneratedHtmlId}) so two
   * ScheduleSection instances on the same page (pack form + open query
   * flyout) don't share radio ids — a duplicate id makes `<label htmlFor>`
   * activate the first matching radio in the document, leaking clicks
   * across forms.
   */
  idPrefix?: string;
}

export const ScheduleTypeSelector = ({
  value,
  onChange,
  lockedScheduleType,
  disabled,
  idPrefix: idPrefixProp,
}: ScheduleTypeSelectorProps) => {
  const generatedIdPrefix = useGeneratedHtmlId({ prefix: 'osquery-schedule-type' });
  const idPrefix = idPrefixProp ?? generatedIdPrefix;
  const isLocked = lockedScheduleType !== undefined;
  const effectiveValue = isLocked ? lockedScheduleType : value;

  const isInteractive = !isLocked && !disabled;

  const handleSelect = useCallback(
    (next: ScheduleType) => {
      if (!isInteractive || next === value) return;
      onChange(next);
    },
    [isInteractive, onChange, value]
  );

  const intervalSelectable = useMemo(
    () => ({
      onClick: isInteractive ? () => handleSelect('interval') : noop,
      isSelected: effectiveValue === 'interval',
      isDisabled: !isInteractive,
    }),
    [effectiveValue, handleSelect, isInteractive]
  );

  const recurrenceSelectable = useMemo(
    () => ({
      onClick: isInteractive ? () => handleSelect('rrule') : noop,
      isSelected: effectiveValue === 'rrule',
      isDisabled: !isInteractive,
    }),
    [effectiveValue, handleSelect, isInteractive]
  );

  return (
    <EuiFormRow
      label={SCHEDULE_TYPE_LABEL}
      helpText={isLocked ? SCHEDULE_TYPE_LOCKED_HELP : undefined}
      fullWidth
    >
      <EuiFlexGroup gutterSize="m" data-test-subj="osquery-schedule-type-selector">
        <EuiFlexItem>
          <StyledEuiCard
            isInteractive={isInteractive}
            layout="horizontal"
            title={
              <EuiRadio
                id={`${idPrefix}-interval`}
                name={idPrefix}
                label={SCHEDULE_TYPE_INTERVAL_LABEL}
                onChange={noop}
                checked={effectiveValue === 'interval'}
                disabled={disabled || isLocked}
              />
            }
            titleSize="xs"
            hasBorder
            description={SCHEDULE_TYPE_INTERVAL_DESCRIPTION}
            data-test-subj="osquery-schedule-type-interval"
            selectable={intervalSelectable}
            {...(effectiveValue === 'interval' && { color: 'primary' })}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StyledEuiCard
            isInteractive={isInteractive}
            layout="horizontal"
            title={
              <EuiRadio
                id={`${idPrefix}-rrule`}
                name={idPrefix}
                label={SCHEDULE_TYPE_RECURRENCE_LABEL}
                onChange={noop}
                checked={effectiveValue === 'rrule'}
                disabled={disabled || isLocked}
              />
            }
            titleSize="xs"
            hasBorder
            description={SCHEDULE_TYPE_RECURRENCE_DESCRIPTION}
            data-test-subj="osquery-schedule-type-rrule"
            selectable={recurrenceSelectable}
            {...(effectiveValue === 'rrule' && { color: 'primary' })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
