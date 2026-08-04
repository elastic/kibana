import React from 'react';
import type { CaseUI } from '../../../common/ui';
export interface ObservablesTableProps {
    caseData: CaseUI;
    isLoading: boolean;
    onExtractObservablesChanged: (isOn: boolean) => void;
}
export declare const ObservablesTable: {
    ({ caseData, isLoading, onExtractObservablesChanged, }: ObservablesTableProps): React.JSX.Element;
    displayName: string;
};
