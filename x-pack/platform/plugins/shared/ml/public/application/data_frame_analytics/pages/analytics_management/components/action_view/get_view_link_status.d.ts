import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
interface ViewLinkStatusReturn {
    disabled: boolean;
    tooltipContent?: string;
}
export declare function getViewLinkStatus(item: DataFrameAnalyticsListRow): ViewLinkStatusReturn;
export {};
