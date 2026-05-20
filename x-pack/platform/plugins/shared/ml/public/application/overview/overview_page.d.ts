import type { FC } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
export declare const overviewPanelDefaultState: Readonly<{
    nodes: true;
    adJobs: true;
    dfaJobs: true;
}>;
declare enum TAB_IDS {
    OVERVIEW = "overview",
    NOTIFICATIONS = "notifications"
}
export type TabIdType = (typeof TAB_IDS)[keyof typeof TAB_IDS];
export declare const OverviewPage: FC<{
    timefilter: TimefilterContract;
}>;
export default OverviewPage;
