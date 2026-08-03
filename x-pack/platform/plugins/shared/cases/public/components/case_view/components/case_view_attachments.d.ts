import React from 'react';
import type { CaseUI } from '../../../../common';
import type { OnUpdateFields } from '../types';
interface CaseViewAttachmentsProps {
    caseData: CaseUI;
    onSearch: (searchTerm: string) => void;
    searchTerm?: string;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const CaseViewAttachments: {
    ({ caseData, onSearch, searchTerm, onUpdateField, }: CaseViewAttachmentsProps): React.JSX.Element;
    displayName: string;
};
export {};
