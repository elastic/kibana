import React from 'react';
import type { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
interface ShowTableLinkProps {
    tabId: typeof CASE_VIEW_PAGE_TABS.ALERTS;
    tooltipText?: string;
}
export declare const ShowTableButton: React.FC<ShowTableLinkProps>;
export {};
