/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { dlmPhasesSelectorStrings as strings } from '../strings';
import type { DlmPhaseDuration } from '../types';
import { DurationFields } from './duration_fields';
import { PhaseCard } from './phase_card';

export interface DeletePhaseCardProps {
  id: string;
  duration: DlmPhaseDuration;
  isCardDisabled: boolean;
  durationError?: string;
  helpText?: React.ReactNode;
  isFormDisabled: boolean;
  onChange: (duration: DlmPhaseDuration) => void;
}

export const DeletePhaseCard = ({
  id,
  duration,
  isCardDisabled,
  durationError,
  helpText,
  isFormDisabled,
  onChange,
}: DeletePhaseCardProps) => {
  const isDurationFieldsDisabled = isFormDisabled || isCardDisabled;

  return (
    <PhaseCard
      id={id}
      checked={duration.enabled}
      dataTestSubj="dlmPhasesSelectorDeletePhaseCard"
      disabled={isCardDisabled}
      checkboxAriaLabel={strings.deletePhaseCheckboxAriaLabel}
      title={strings.deletePhaseLabel}
      description={strings.deletePhaseDescription}
      icon={<EuiIcon type="trash" color={isCardDisabled ? 'subdued' : 'text'} aria-hidden />}
      onChange={(checked) => onChange({ ...duration, enabled: checked })}
    >
      <DurationFields
        label={strings.deleteAfterLabel}
        phaseLabel={strings.deletePhaseLabel}
        testSubjectPrefix="delete"
        duration={duration}
        error={durationError}
        helpText={helpText}
        disabled={isDurationFieldsDisabled}
        onChange={onChange}
      />
    </PhaseCard>
  );
};
