/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import type { DlmPhaseDuration } from '../types';
import { getDurationUnitSelectOptions } from '../utils/duration_utils';
import { dlmPhasesSelectorStrings as strings } from '../strings';
import { usePhaseCardStyles } from './styles';

export interface DurationFieldsProps {
  label: string;
  phaseLabel: string;
  testSubjectPrefix: string;
  duration: DlmPhaseDuration;
  error?: string;
  helpText?: React.ReactNode;
  disabled?: boolean;
  onChange: (duration: DlmPhaseDuration) => void;
}

export const DurationFields = ({
  label,
  phaseLabel,
  testSubjectPrefix,
  duration,
  error,
  helpText,
  disabled,
  onChange,
}: DurationFieldsProps) => {
  const styles = usePhaseCardStyles();
  const unitOptions = useMemo(() => getDurationUnitSelectOptions(duration.unit), [duration.unit]);

  return (
    <EuiFormRow
      label={label}
      isInvalid={Boolean(error)}
      error={error}
      helpText={error ? undefined : helpText}
      fullWidth
      data-test-subj={`${testSubjectPrefix}DurationFormRow`}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} css={styles.fields}>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            fullWidth
            min={1}
            step={1}
            value={duration.value}
            disabled={disabled}
            isInvalid={Boolean(error)}
            aria-label={strings.durationInputAriaLabel(phaseLabel)}
            data-test-subj={`${testSubjectPrefix}DurationValue`}
            onChange={(event) => onChange({ ...duration, value: event.target.value })}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            compressed
            fullWidth
            value={duration.unit}
            options={unitOptions}
            disabled={disabled}
            aria-label={strings.durationUnitAriaLabel(phaseLabel)}
            data-test-subj={`${testSubjectPrefix}DurationUnit`}
            onChange={(event) => onChange({ ...duration, unit: event.target.value })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
