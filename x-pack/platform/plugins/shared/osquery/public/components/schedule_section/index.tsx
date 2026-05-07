/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';

import type { ScheduleType } from '../../../common/schedule';
import { IntervalField } from '../../form/interval_field';
import { FrequencySelector } from './frequency_selector';
import { ScheduleTypeSelector } from './schedule_type_selector';
import { SplayTimeField } from './splay_time_field';
import { StartDateField } from './start_date_field';
import { StopAfterField } from './stop_after_field';

interface ScheduleSectionProps {
  isDisabled?: boolean;
  /**
   * When set, the {@link ScheduleTypeSelector} is locked to this mode and the
   * form's `schedule_type` is forced to match. Used by `QueryFlyout` to enforce
   * the same-mode constraint (D11): per-query overrides change the schedule
   * details but not the mode, which is set at the pack level.
   */
  lockedScheduleType?: ScheduleType;
}

const ScheduleSectionComponent: React.FC<ScheduleSectionProps> = ({
  isDisabled = false,
  lockedScheduleType,
}) => {
  // `defaultValue` is intentionally omitted: passing one to `useWatch` would
  // shadow the form's `defaultValues.schedule_type` on the first render
  // (RHF 7.x quirk), making the panel render IntervalField even when the
  // pack was loaded with `schedule_type: 'rrule'`.
  const scheduleType = useWatch<{ schedule_type: ScheduleType }, 'schedule_type'>({
    name: 'schedule_type',
  });

  const { setValue } = useFormContext<{ schedule_type: ScheduleType }>();

  // Sync the form's `schedule_type` to the pack-level lock so a query starting
  // in the wrong mode (e.g. legacy interval default on an rrule pack) lands on
  // the correct render path without relying on parent re-mounts.
  useEffect(() => {
    if (lockedScheduleType && scheduleType !== lockedScheduleType) {
      setValue('schedule_type', lockedScheduleType, { shouldDirty: false });
    }
  }, [lockedScheduleType, scheduleType, setValue]);

  const intervalEuiFieldProps = useMemo(() => ({ append: 's', isDisabled }), [isDisabled]);
  const effectiveType = lockedScheduleType ?? scheduleType;
  const isTypeLocked = lockedScheduleType != null;

  return (
    <div data-test-subj="osquery-schedule-section">
      <ScheduleTypeSelector isDisabled={isDisabled} isTypeLocked={isTypeLocked} />
      {isTypeLocked && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" data-test-subj="osquery-schedule-type-locked-help">
            {i18n.translate('xpack.osquery.scheduleSection.typeSelector.lockedHelp', {
              defaultMessage:
                'Overrides change the schedule details; mode is set at the pack level.',
            })}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />

      <EuiPanel hasShadow={false} hasBorder color="subdued" paddingSize="m">
        {effectiveType === 'interval' ? (
          <IntervalField euiFieldProps={intervalEuiFieldProps} />
        ) : (
          <>
            <StartDateField isDisabled={isDisabled} />
            <EuiSpacer size="m" />
            <FrequencySelector isDisabled={isDisabled} />
            <EuiSpacer size="m" />
            <StopAfterField isDisabled={isDisabled} />
            <EuiSpacer size="m" />
            <SplayTimeField isDisabled={isDisabled} />
          </>
        )}
      </EuiPanel>
    </div>
  );
};

export const ScheduleSection = React.memo(ScheduleSectionComponent);

export { ScheduleTypeSelector } from './schedule_type_selector';
export { StartDateField } from './start_date_field';
export { FrequencySelector } from './frequency_selector';
export { StopAfterField } from './stop_after_field';
export { SplayTimeField } from './splay_time_field';
export type { ScheduleFormData, ScheduleFrequency } from './types';
export { DEFAULT_SCHEDULE_FORM_VALUES } from './types';
