import React from 'react';
import type { CaseUI } from '../../../common';
export interface ObservablesUtilityBarProps {
    caseData: CaseUI;
    isLoading: boolean;
    onExtractObservablesChanged: (isOn: boolean) => void;
}
export declare const ObservablesUtilityBar: {
    ({ caseData, isLoading, onExtractObservablesChanged, }: ObservablesUtilityBarProps): React.JSX.Element;
    displayName: string;
};
