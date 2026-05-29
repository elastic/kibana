/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ScheduleType } from '../../../common/schedule';
import {
  SCHEDULE_TYPE_INTERVAL_DESCRIPTION,
  SCHEDULE_TYPE_INTERVAL_LABEL,
  SCHEDULE_TYPE_LOCKED_HELP,
  SCHEDULE_TYPE_RECURRENCE_DESCRIPTION,
  SCHEDULE_TYPE_RECURRENCE_LABEL,
} from './translations';

const BOLD_LABEL_PROPS = { style: { fontWeight: 'bold' } } as const;
const FULL_HEIGHT_CSS = css({ height: '100%' });

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

  const handleSelectInterval = useCallback(() => handleSelect('interval'), [handleSelect]);
  const handleSelectRrule = useCallback(() => handleSelect('rrule'), [handleSelect]);

  return (
    <EuiFormRow
      helpText={isLocked ? SCHEDULE_TYPE_LOCKED_HELP : undefined}
      fullWidth
    >
      <EuiFlexGroup gutterSize="m" data-test-subj="osquery-schedule-type-selector">
        <EuiFlexItem>
          <EuiCheckableCard
            id={`${idPrefix}-interval`}
            name={idPrefix}
            css={FULL_HEIGHT_CSS}
            label={SCHEDULE_TYPE_INTERVAL_LABEL}
            labelProps={BOLD_LABEL_PROPS}
            checked={effectiveValue === 'interval'}
            disabled={!isInteractive}
            onChange={handleSelectInterval}
            data-test-subj="osquery-schedule-type-interval"
          >
            {SCHEDULE_TYPE_INTERVAL_DESCRIPTION}
          </EuiCheckableCard>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCheckableCard
            id={`${idPrefix}-rrule`}
            name={idPrefix}
            css={FULL_HEIGHT_CSS}
            label={SCHEDULE_TYPE_RECURRENCE_LABEL}
            labelProps={BOLD_LABEL_PROPS}
            checked={effectiveValue === 'rrule'}
            disabled={!isInteractive}
            onChange={handleSelectRrule}
            data-test-subj="osquery-schedule-type-rrule"
          >
            {SCHEDULE_TYPE_RECURRENCE_DESCRIPTION}
          </EuiCheckableCard>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
