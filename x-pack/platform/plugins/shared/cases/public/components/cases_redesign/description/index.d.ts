import React from 'react';
import type { CaseUI } from '../../../containers/types';
import type { OnUpdateFields } from '../../case_view/types';
export type { DescriptionMarkdownRefObject } from './types';
export interface DescriptionProps {
    caseData: CaseUI;
    isLoadingDescription: boolean;
    onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
}
export declare const Description: {
    ({ caseData, onUpdateField, isLoadingDescription, }: DescriptionProps): React.JSX.Element;
    displayName: string;
};
