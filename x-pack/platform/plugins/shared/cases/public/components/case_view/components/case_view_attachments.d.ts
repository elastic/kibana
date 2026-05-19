import type { PropsWithChildren } from 'react';
import React from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseUI } from '../../../../common';
export declare const CaseViewAttachments: {
    ({ caseData, activeTab, onSearch, searchTerm, children, }: PropsWithChildren<{
        caseData: CaseUI;
        activeTab: CASE_VIEW_PAGE_TABS;
        onSearch: (searchTerm: string) => void;
        searchTerm?: string;
    }>): React.JSX.Element;
    displayName: string;
};
