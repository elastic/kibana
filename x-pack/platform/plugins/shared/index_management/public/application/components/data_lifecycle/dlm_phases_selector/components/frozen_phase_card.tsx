/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiIconTip, EuiSpacer, EuiText } from '@elastic/eui';
import {
  DefaultRepositoryRequiredBadge,
  EnterpriseLicenseRequiredBadge,
  SearchableSnapshotRepositoryInfo,
} from '@kbn/data-lifecycle-phases';
import { dlmPhasesSelectorStrings as strings } from '../strings';
import type { DlmPhaseDuration } from '../types';
import { DurationFields } from './duration_fields';
import { PhaseCard } from './phase_card';

export type FrozenDisabledReason =
  | { type: 'enterprise'; onClick?: () => void }
  | { type: 'defaultRepository'; onClick?: () => void };

export interface FrozenPhaseCardProps {
  id: string;
  color: string;
  duration: DlmPhaseDuration;
  disabled: boolean;
  disabledReason?: FrozenDisabledReason;
  durationError?: string;
  helpText?: React.ReactNode;
  isFormDisabled: boolean;
  defaultSnapshotRepository?: string;
  manageRepositoriesHref?: string;
  onChange: (duration: DlmPhaseDuration) => void;
}

const DisabledReasonBadge = ({ disabledReason }: { disabledReason: FrozenDisabledReason }) => {
  if (disabledReason.type === 'enterprise') {
    return <EnterpriseLicenseRequiredBadge onClick={disabledReason.onClick} />;
  }

  return <DefaultRepositoryRequiredBadge onClick={disabledReason.onClick} />;
};

export const FrozenPhaseCard = ({
  id,
  color,
  duration,
  disabled,
  disabledReason,
  durationError,
  helpText,
  isFormDisabled,
  defaultSnapshotRepository,
  manageRepositoriesHref,
  onChange,
}: FrozenPhaseCardProps) => {
  const isDurationFieldsDisabled = isFormDisabled || disabled;
  const showConfig = !disabledReason;

  return (
    <PhaseCard
      id={id}
      checked={duration.enabled}
      dataTestSubj="dlmPhasesSelectorFrozenPhaseCard"
      disabled={disabled}
      checkboxAriaLabel={strings.frozenPhaseCheckboxAriaLabel}
      title={strings.frozenPhaseLabel}
      description={strings.frozenPhaseDescription}
      icon={<EuiIcon type="dot" color={color} size="m" aria-hidden />}
      badges={disabledReason ? <DisabledReasonBadge disabledReason={disabledReason} /> : undefined}
      onChange={(checked) => onChange({ ...duration, enabled: checked })}
    >
      {showConfig && (
        <>
          <DurationFields
            label={strings.moveAfterLabel}
            phaseLabel={strings.frozenPhaseLabel}
            testSubjectPrefix="frozen"
            duration={duration}
            error={durationError}
            helpText={helpText}
            disabled={isDurationFieldsDisabled}
            onChange={onChange}
          />

          <EuiSpacer size="m" />

          <EuiText size="s" data-test-subj="frozenSearchableSnapshotLabel">
            <strong>
              {strings.searchableSnapshotLabel}{' '}
              <EuiIconTip content={strings.searchableSnapshotTooltip} type="info" color="subdued" />
            </strong>
          </EuiText>

          {defaultSnapshotRepository && (
            <>
              <EuiSpacer size="xs" />

              <EuiText size="s" color="subdued" data-test-subj="frozenSearchableSnapshotInfo">
                <SearchableSnapshotRepositoryInfo
                  defaultRepository={defaultSnapshotRepository}
                  manageRepositoriesHref={manageRepositoriesHref}
                />
              </EuiText>
            </>
          )}
        </>
      )}
    </PhaseCard>
  );
};
