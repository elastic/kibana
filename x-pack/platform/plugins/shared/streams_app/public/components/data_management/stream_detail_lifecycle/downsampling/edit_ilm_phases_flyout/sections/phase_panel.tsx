/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

import type { IlmPhasesFlyoutFormInternal } from '../form';
import { DeleteSearchableSnapshotToggleField, MinAgeField, ReadOnlyToggleField } from '../form';
import { READONLY_ALLOWED_PHASES, TIME_UNIT_OPTIONS } from '../constants';
import { DownsampleFieldSection } from './downsample_field_section';
import { PhaseFieldsMount } from './phase_fields_mount';
import { RemovePhaseButton } from './remove_phase_button';
import { SearchableSnapshotFieldSection } from './searchable_snapshot_field_section';

export interface PhasePanelProps {
  phase: PhaseName;
  selectedPhase: PhaseName | undefined;
  enabledPhases: PhaseName[];
  setSelectedPhase: (phase: PhaseName | undefined) => void;
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  dataTestSubj: string;
  sectionStyles: SerializedStyles;
  searchableSnapshotRepositories: string[];
  canCreateRepository: boolean;
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;
}

export const PhasePanel = ({
  phase,
  selectedPhase,
  enabledPhases,
  setSelectedPhase,
  form,
  dataTestSubj,
  sectionStyles,
  searchableSnapshotRepositories,
  canCreateRepository,
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
}: PhasePanelProps) => {
  const isHidden = selectedPhase !== phase;

  const isHotPhase = phase === 'hot';
  const isWarmPhase = phase === 'warm';
  const isColdPhase = phase === 'cold';
  const isFrozenPhase = phase === 'frozen';
  const isDeletePhase = phase === 'delete';
  const showSearchableSnapshotSectionForCold =
    canCreateRepository || searchableSnapshotRepositories.length > 0;

  return (
    <div hidden={isHidden}>
      <PhaseFieldsMount phase={phase} />

      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        responsive={false}
        css={sectionStyles}
        data-test-subj={`${dataTestSubj}Panel-${phase}`}
      >
        {!isHotPhase && (
          <EuiFlexItem grow={false}>
            <MinAgeField
              phaseName={phase}
              dataTestSubj={dataTestSubj}
              timeUnitOptions={TIME_UNIT_OPTIONS}
            />
          </EuiFlexItem>
        )}

        {(isHotPhase || isWarmPhase || isColdPhase) && (
          <EuiFlexItem grow={false}>
            <ReadOnlyToggleField
              form={form}
              phaseName={phase}
              dataTestSubj={dataTestSubj}
              allowedPhases={READONLY_ALLOWED_PHASES}
            />
          </EuiFlexItem>
        )}

        {isDeletePhase && (
          <EuiFlexItem grow={false}>
            <DeleteSearchableSnapshotToggleField
              form={form}
              phaseName={phase}
              dataTestSubj={dataTestSubj}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {(isHotPhase || isWarmPhase || isColdPhase) && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <DownsampleFieldSection form={form} phaseName={phase} dataTestSubj={dataTestSubj} />
          </div>
        </>
      )}

      {((isColdPhase && showSearchableSnapshotSectionForCold) || isFrozenPhase) && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <SearchableSnapshotFieldSection
              form={form}
              phaseName={phase}
              dataTestSubj={dataTestSubj}
              searchableSnapshotRepositories={searchableSnapshotRepositories}
              canCreateRepository={canCreateRepository}
              isLoadingSearchableSnapshotRepositories={isLoadingSearchableSnapshotRepositories}
              onRefreshSearchableSnapshotRepositories={onRefreshSearchableSnapshotRepositories}
              onCreateSnapshotRepository={onCreateSnapshotRepository}
            />
          </div>
        </>
      )}

      {!isHotPhase && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <RemovePhaseButton
              form={form}
              phaseName={phase}
              enabledPhases={enabledPhases}
              dataTestSubj={dataTestSubj}
              setSelectedPhase={setSelectedPhase}
            />
          </div>
        </>
      )}
    </div>
  );
};
