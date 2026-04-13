import React from 'react';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import { type FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from '../types';
export interface SearchableSnapshotRepositoryFieldProps {
    form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
    repositoryOptions: Array<{
        value: string;
        text: string;
    }>;
    isLoadingSearchableSnapshotRepositories?: boolean;
    onRefreshSearchableSnapshotRepositories?: () => void;
    onCreateSnapshotRepository?: () => void;
    showCreateRepositoryLink?: boolean;
    dataTestSubj: string;
}
export declare const SearchableSnapshotRepositoryField: ({ form, repositoryOptions, isLoadingSearchableSnapshotRepositories, onRefreshSearchableSnapshotRepositories, onCreateSnapshotRepository, showCreateRepositoryLink, dataTestSubj, }: SearchableSnapshotRepositoryFieldProps) => React.JSX.Element | null;
