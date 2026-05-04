/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { useWatch } from 'react-hook-form';

import type { ScheduleType } from '../../../common/schedule';
import { IntervalField } from '../../form/interval_field';
import { FrequencySelector } from './frequency_selector';
import { ScheduleTypeSelector } from './schedule_type_selector';
import { SplayTimeField } from './splay_time_field';
import { StartDateField } from './start_date_field';
import { StopAfterField } from './stop_after_field';

interface ScheduleSectionProps {
  isDisabled?: boolean;
}

const ScheduleSectionComponent: React.FC<ScheduleSectionProps> = ({ isDisabled = false }) => {
  const scheduleType = useWatch<{ schedule_type: ScheduleType }, 'schedule_type'>({
    name: 'schedule_type',
    defaultValue: 'interval',
  });

  const intervalEuiFieldProps = useMemo(() => ({ append: 's', isDisabled }), [isDisabled]);

  return (
    <div data-test-subj="osquery-schedule-section">
      <ScheduleTypeSelector isDisabled={isDisabled} />
      <EuiSpacer size="m" />

      <EuiPanel hasShadow={false} hasBorder color="subdued" paddingSize="m">
        {scheduleType === 'interval' ? (
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
