import type { EuiThemeComputed } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { type CaseUI } from '../../../common';
export declare const SimilarCasesBadge: {
    ({ activeTab, count, euiTheme, }: {
        activeTab: string;
        count?: number;
        euiTheme: EuiThemeComputed<{}>;
    }): React.JSX.Element;
    displayName: string;
};
export declare const AttachmentsBadge: {
    ({ isActive, count, euiTheme, }: {
        isActive: boolean;
        count?: number;
        euiTheme: EuiThemeComputed<{}>;
    }): React.JSX.Element;
    displayName: string;
};
export interface CaseViewTab {
    badge?: ReactNode;
    id: CASE_VIEW_PAGE_TABS;
    name: string;
}
export interface UseCaseAttachmentTabsReturnValue {
    tabs: CaseViewTab[];
    totalAttachments: number;
}
export declare const useCaseAttachmentTabs: ({ caseData, activeTab, searchTerm, }: {
    caseData: CaseUI;
    activeTab: CASE_VIEW_PAGE_TABS;
    searchTerm?: string;
}) => UseCaseAttachmentTabsReturnValue;
