import React from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { type CaseUI } from '../../../common';
export interface CaseViewTabsProps {
    caseData: CaseUI;
    activeTab: CASE_VIEW_PAGE_TABS;
}
export declare const CaseViewTabs: React.NamedExoticComponent<CaseViewTabsProps>;
