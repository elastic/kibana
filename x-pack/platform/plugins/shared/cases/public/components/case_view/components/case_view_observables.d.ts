import React from 'react';
import type { CaseUI, ObservableUI } from '../../../../common/ui/types';
import type { OnUpdateFields } from '../types';
export declare const OBSERVABLES_FILTER_ID = "observables";
interface CaseViewObservablesProps {
    caseData: CaseUI;
    observables: ObservableUI[];
    searchTerm?: string;
    isLoading: boolean;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const CaseViewObservables: {
    ({ caseData, observables, searchTerm, isLoading, onUpdateField, }: CaseViewObservablesProps): React.JSX.Element | null;
    displayName: string;
};
export {};
