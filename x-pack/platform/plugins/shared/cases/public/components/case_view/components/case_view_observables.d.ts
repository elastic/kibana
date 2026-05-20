import React from 'react';
import type { CaseUI } from '../../../../common/ui/types';
import type { OnUpdateFields } from '../types';
interface CaseViewObservablesProps {
    caseData: CaseUI;
    searchTerm?: string;
    isLoading: boolean;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const CaseViewObservables: {
    ({ caseData, searchTerm, isLoading, onUpdateField, }: CaseViewObservablesProps): React.JSX.Element;
    displayName: string;
};
export {};
