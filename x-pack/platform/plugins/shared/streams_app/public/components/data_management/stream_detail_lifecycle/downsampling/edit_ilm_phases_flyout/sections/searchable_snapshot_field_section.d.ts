import React from 'react';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../form';
export interface SearchableSnapshotFieldSectionProps {
    form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
    phaseName: 'cold' | 'frozen';
    dataTestSubj: string;
    searchableSnapshotRepositories: string[];
    canCreateRepository: boolean;
    isLoadingSearchableSnapshotRepositories?: boolean;
    onRefreshSearchableSnapshotRepositories?: () => void;
    onCreateSnapshotRepository?: () => void;
}
export declare const SearchableSnapshotFieldSection: ({ form, phaseName, dataTestSubj, searchableSnapshotRepositories, canCreateRepository, isLoadingSearchableSnapshotRepositories, onRefreshSearchableSnapshotRepositories, onCreateSnapshotRepository, }: SearchableSnapshotFieldSectionProps) => React.JSX.Element | null;
