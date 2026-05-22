/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import type { PhaseName } from '@kbn/streams-schema';
import { useFormContext, useWatch } from 'react-hook-form';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';

import { useIlmPhasesColorAndDescription } from '../../../hooks/use_ilm_phases_color_and_description';
import { useStyles } from '../use_styles';
import type { IlmPhasesFlyoutFormInternal } from '../form';
import { DeleteSearchableSnapshotToggleField, MinAgeField, ReadOnlyToggleField } from '../form';
import { TIME_UNIT_OPTIONS } from '../constants';
import { DownsampleFieldSection } from './downsample_field_section';
import { PhaseFieldsMount } from './phase_fields_mount';
import { RemovePhaseButton } from './remove_phase_button';
import { SearchableSnapshotFieldSection } from './searchable_snapshot_field_section';

export interface PhasePanelProps {
  phase: PhaseName;
  selectedPhase: PhaseName | undefined;
  enabledPhases: PhaseName[];
  setSelectedPhase: (phase: PhaseName | undefined) => void;
  dataTestSubj: string;
  sectionStyles: SerializedStyles;
  searchableSnapshotRepositories: string[];
  canCreateRepository: boolean;
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;
  isMetricsStream: boolean;
}

export const PhasePanel = ({
  phase,
  selectedPhase,
  enabledPhases,
  setSelectedPhase,
  dataTestSubj,
  sectionStyles,
  searchableSnapshotRepositories,
  canCreateRepository,
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
  isMetricsStream,
}: PhasePanelProps) => {
  const isHidden = selectedPhase !== phase;
  const { control } = useFormContext<IlmPhasesFlyoutFormInternal>();
  const { phaseDescriptionStyles, phaseDescriptionNoBottomPaddingStyles } = useStyles();

  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const isHotPhase = phase === 'hot';
  const isWarmPhase = phase === 'warm';
  const isColdPhase = phase === 'cold';
  const isFrozenPhase = phase === 'frozen';
  const isDeletePhase = phase === 'delete';
  const showSearchableSnapshotSectionForCold =
    canCreateRepository || searchableSnapshotRepositories.length > 0;

  const [hotDownsampleEnabled, warmDownsampleEnabled, coldDownsampleEnabled] = useWatch({
    control,
    name: [
      '_meta.hot.downsampleEnabled',
      '_meta.warm.downsampleEnabled',
      '_meta.cold.downsampleEnabled',
    ],
  });
  const isDownsampleEnabled =
    phase === 'hot'
      ? Boolean(hotDownsampleEnabled)
      : phase === 'warm'
      ? Boolean(warmDownsampleEnabled)
      : phase === 'cold'
      ? Boolean(coldDownsampleEnabled)
      : false;

  const descriptionStyles =
    isHotPhase && isDownsampleEnabled
      ? phaseDescriptionStyles
      : phaseDescriptionNoBottomPaddingStyles;

  return (
    <div hidden={isHidden} data-test-subj={`${dataTestSubj}Panel-${phase}`}>
      <PhaseFieldsMount phase={phase} />
      <EuiText size="s" color="subdued" css={descriptionStyles}>
        {ilmPhases[phase].description}
      </EuiText>
      {(!isHotPhase || !isDownsampleEnabled) && (
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false} css={sectionStyles}>
          {!isHotPhase && (
            <EuiFlexItem grow={false}>
              <MinAgeField
                phaseName={phase}
                dataTestSubj={dataTestSubj}
                timeUnitOptions={TIME_UNIT_OPTIONS}
              />
            </EuiFlexItem>
          )}

          {(isHotPhase || isWarmPhase || isColdPhase) && !isDownsampleEnabled && (
            <EuiFlexItem grow={false}>
              <ReadOnlyToggleField phaseName={phase} dataTestSubj={dataTestSubj} />
            </EuiFlexItem>
          )}

          {isDeletePhase && (
            <EuiFlexItem grow={false}>
              <DeleteSearchableSnapshotToggleField phaseName={phase} dataTestSubj={dataTestSubj} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}

      {(isHotPhase || isWarmPhase || isColdPhase) && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <DownsampleFieldSection
              phaseName={phase}
              dataTestSubj={dataTestSubj}
              isMetricsStream={isMetricsStream}
            />
          </div>
        </>
      )}

      {((isColdPhase && showSearchableSnapshotSectionForCold) || isFrozenPhase) && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <SearchableSnapshotFieldSection
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
