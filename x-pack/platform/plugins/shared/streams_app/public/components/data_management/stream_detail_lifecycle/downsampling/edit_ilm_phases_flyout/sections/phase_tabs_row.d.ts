import React from 'react';
import type { PhaseName } from '@kbn/streams-schema';
export interface PhaseTabsRowProps {
    enabledPhases: PhaseName[];
    searchableSnapshotRepositories: string[];
    canCreateRepository: boolean;
    selectedPhase: PhaseName | undefined;
    setSelectedPhase: (phase: PhaseName | undefined) => void;
    tabHasErrors: (phaseName: PhaseName) => boolean;
    dataTestSubj: string;
}
export declare const PhaseTabsRow: ({ enabledPhases, searchableSnapshotRepositories, canCreateRepository, selectedPhase, setSelectedPhase, tabHasErrors, dataTestSubj, }: PhaseTabsRowProps) => React.JSX.Element;
