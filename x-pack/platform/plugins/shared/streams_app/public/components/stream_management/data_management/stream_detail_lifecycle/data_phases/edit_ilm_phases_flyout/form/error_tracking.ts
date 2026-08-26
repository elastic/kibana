/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { PhaseName } from '@kbn/streams-schema';
import { get } from 'lodash';
import type { DeepPartial, FieldErrors, FieldPath } from 'react-hook-form';
import { PHASE_ORDER } from '@kbn/data-lifecycle-phases';
import type { IlmPhasesFlyoutFormInternal } from './types';

/**
 * Paths that `EditIlmPhasesFlyout` must watch to ensure tab error indicators refresh when
 * validations are gated by form values (not just by `errors` updates).
 *
 * Keep this list in sync with `useIlmPhasesFlyoutTabErrors` whenever you add new `formData`-based
 * gating logic (e.g. toggles that determine whether a shared error should surface on a tab).
 */
export const ILM_PHASES_FLYOUT_TAB_ERROR_INDICATOR_WATCH_PATHS: Array<
  FieldPath<IlmPhasesFlyoutFormInternal>
> = [
  ...PHASE_ORDER.map((p) => `_meta.${p}.enabled` satisfies FieldPath<IlmPhasesFlyoutFormInternal>),
  // Enable/disable toggles that gate validations (tabs need to update when these change).
  '_meta.hot.downsampleEnabled',
  '_meta.warm.downsampleEnabled',
  '_meta.cold.downsampleEnabled',
  '_meta.cold.searchableSnapshotEnabled',
  '_meta.searchableSnapshot.repository',
];

type DownsampleEnabledPhaseName = 'hot' | 'warm' | 'cold';
const isDownsampleEnabledPhase = (phaseName: PhaseName): phaseName is DownsampleEnabledPhaseName =>
  phaseName === 'hot' || phaseName === 'warm' || phaseName === 'cold';

export const useIlmPhasesFlyoutTabErrors = (
  formData: DeepPartial<IlmPhasesFlyoutFormInternal> | undefined,
  errors: FieldErrors<IlmPhasesFlyoutFormInternal>
) => {
  const tabHasErrors = useCallback(
    (phaseName: PhaseName) => {
      const hasErrorAt = (path: FieldPath<IlmPhasesFlyoutFormInternal>) =>
        Boolean(get(errors, path));

      // Min age validations live on the value field for warm/cold/frozen/delete.
      if (phaseName !== 'hot' && hasErrorAt(`_meta.${phaseName}.minAgeValue`)) return true;

      // Downsample validations live on the fixedIntervalValue field.
      const downsampleEnabled = isDownsampleEnabledPhase(phaseName)
        ? Boolean(formData?._meta?.[phaseName]?.downsampleEnabled)
        : false;
      if (
        isDownsampleEnabledPhase(phaseName) &&
        downsampleEnabled &&
        hasErrorAt(`_meta.${phaseName}.downsample.fixedIntervalValue`)
      ) {
        return true;
      }

      // Searchable snapshot repository is a shared field, but should surface per-phase.
      const repositoryHasError = hasErrorAt('_meta.searchableSnapshot.repository');
      if (repositoryHasError) {
        const coldSnapshotEnabled = Boolean(formData?._meta?.cold?.searchableSnapshotEnabled);
        if (phaseName === 'cold' && coldSnapshotEnabled) return true;
        if (phaseName === 'frozen') return true; // Frozen always requires searchable snapshots.
      }

      return false;
    },
    [errors, formData]
  );

  return { tabHasErrors };
};
