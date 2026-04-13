import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../form';
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
    isMetricsStream: boolean;
    phaseDescriptionStyles: SerializedStyles;
}
export declare const PhasePanel: ({ phase, selectedPhase, enabledPhases, setSelectedPhase, form, dataTestSubj, sectionStyles, searchableSnapshotRepositories, canCreateRepository, isLoadingSearchableSnapshotRepositories, onRefreshSearchableSnapshotRepositories, onCreateSnapshotRepository, isMetricsStream, phaseDescriptionStyles, }: PhasePanelProps) => React.JSX.Element;
