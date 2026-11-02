/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useGeneratedHtmlId } from '@elastic/eui';
import { getTimingBoundHelpText, usePhaseColors } from '@kbn/data-lifecycle-phases';
import {
  getDurationLabel,
  mergeDefaultValue,
  serializeDlmPhases,
  validateDurations,
} from './utils/duration_utils';
import { DeletePhaseCard } from './components/delete_phase_card';
import { FrozenPhaseCard } from './components/frozen_phase_card';
import { HotPhaseCard } from './components/hot_phase_card';
import { dlmPhasesSelectorStrings as strings } from './strings';
import type { DlmPhaseDuration, DlmPhasesSelectorProps, DlmPhasesSelectorValue } from './types';

export type {
  DlmPhaseDuration,
  DlmPhasesSelectorEnterpriseConfig,
  DlmPhasesSelectorProps,
  DlmPhasesSelectorValue,
  SerializedDlmPhases,
} from './types';

export const DlmPhasesSelector = ({
  defaultValue,
  hasEnterpriseLicense = false,
  hasDefaultSnapshotRepository = false,
  isDisabled = false,
  defaultSnapshotRepository,
  maximumRetentionPeriod,
  serverless = false,
  manageRepositoriesUrl,
  createDefaultRepositoryUrl,
  canCreateDefaultSnapshotRepository = false,
  hasExistingRepositories = false,
  enterprise,
  onRefreshDefaultSnapshotRepository,
  onChange,
}: DlmPhasesSelectorProps) => {
  const hotCheckboxId = useGeneratedHtmlId({ prefix: 'dlmHotPhase' });
  const frozenCheckboxId = useGeneratedHtmlId({ prefix: 'dlmFrozenPhase' });
  const deleteCheckboxId = useGeneratedHtmlId({ prefix: 'dlmDeletePhase' });
  const phaseColors = usePhaseColors();

  const [value, setValue] = useState<DlmPhasesSelectorValue>(() => mergeDefaultValue(defaultValue));

  const frozenInitiallyActiveRef = useRef(value.frozen.enabled);

  const isFrozenStillActiveFromExisting = frozenInitiallyActiveRef.current && value.frozen.enabled;
  const hasFrozenRepositoryAccessOrAlreadyActive =
    hasDefaultSnapshotRepository ||
    canCreateDefaultSnapshotRepository ||
    isFrozenStillActiveFromExisting;
  const shouldShowFrozenPhase =
    !serverless &&
    enterprise &&
    createDefaultRepositoryUrl &&
    hasFrozenRepositoryAccessOrAlreadyActive;
  const validation = validateDurations(value, maximumRetentionPeriod);

  const updateValue = useCallback(
    (nextValue: DlmPhasesSelectorValue) => {
      setValue(nextValue);
      const nextValidation = validateDurations(nextValue, maximumRetentionPeriod);
      onChange?.(nextValue, serializeDlmPhases(nextValue), nextValidation.isValid);
    },
    [onChange, maximumRetentionPeriod]
  );

  const updateFrozen = useCallback(
    (nextFrozen: DlmPhaseDuration) => {
      updateValue({ ...value, frozen: nextFrozen });
    },
    [updateValue, value]
  );

  const updateDelete = useCallback(
    (nextDelete: DlmPhaseDuration) => {
      updateValue({ ...value, delete: nextDelete });
    },
    [updateValue, value]
  );

  const frozenHelpText =
    value.frozen.enabled && value.delete.enabled
      ? getTimingBoundHelpText({
          upper: {
            neighbor: { type: 'phase', phase: 'delete' },
            value: getDurationLabel(value.delete),
          },
        })
      : undefined;

  const deleteHelpText =
    value.frozen.enabled && value.delete.enabled
      ? getTimingBoundHelpText({
          lower: {
            neighbor: { type: 'phase', phase: 'frozen' },
            value: getDurationLabel(value.frozen),
          },
        })
      : maximumRetentionPeriod && value.delete.enabled
      ? strings.deleteMaximumRetentionText(maximumRetentionPeriod)
      : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {!serverless && (
        <EuiFlexItem grow={false}>
          <HotPhaseCard id={hotCheckboxId} color={phaseColors.hot} />
        </EuiFlexItem>
      )}

      {shouldShowFrozenPhase && (
        <EuiFlexItem grow={false}>
          <FrozenPhaseCard
            id={frozenCheckboxId}
            color={phaseColors.frozen}
            duration={value.frozen}
            durationError={validation.frozenError}
            helpText={frozenHelpText}
            isFormDisabled={isDisabled}
            defaultSnapshotRepository={defaultSnapshotRepository}
            manageRepositoriesHref={manageRepositoriesUrl}
            hasEnterpriseLicense={hasEnterpriseLicense}
            hasDefaultSnapshotRepository={hasDefaultSnapshotRepository}
            canCreateDefaultSnapshotRepository={canCreateDefaultSnapshotRepository}
            createDefaultRepositoryUrl={createDefaultRepositoryUrl}
            hasExistingRepositories={hasExistingRepositories}
            enterprise={enterprise}
            onRefreshDefaultSnapshotRepository={onRefreshDefaultSnapshotRepository}
            onChange={updateFrozen}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <DeletePhaseCard
          id={deleteCheckboxId}
          duration={value.delete}
          isCardDisabled={isDisabled}
          durationError={validation.deleteError}
          helpText={deleteHelpText}
          isFormDisabled={isDisabled}
          onChange={updateDelete}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
