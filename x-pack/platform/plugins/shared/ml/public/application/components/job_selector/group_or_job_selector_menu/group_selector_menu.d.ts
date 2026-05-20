import React from 'react';
import type { MlPages } from '../../../../locator';
export declare const GroupSelectorMenu: ({ groupId, jobIds, page, onRemoveJobId, removeJobIdDisabled, removeGroupDisabled, singleMetricViewerDisabledIds, }: {
    groupId: string;
    jobIds: string[];
    page: MlPages;
    onRemoveJobId: (jobOrGroupId: string[]) => void;
    removeJobIdDisabled: boolean;
    removeGroupDisabled: boolean;
    singleMetricViewerDisabledIds: string[];
}) => React.JSX.Element;
