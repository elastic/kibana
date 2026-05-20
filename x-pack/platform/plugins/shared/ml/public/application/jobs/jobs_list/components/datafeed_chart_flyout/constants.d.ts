import type { ChartSizeArray } from '@elastic/charts';
export declare const CHART_DIRECTION: {
    readonly FORWARD: "forward";
    readonly BACK: "back";
};
export type ChartDirectionType = (typeof CHART_DIRECTION)[keyof typeof CHART_DIRECTION];
export declare const CHART_SIZE: ChartSizeArray;
export declare const TAB_IDS: {
    readonly CHART: "chart";
    readonly MESSAGES: "messages";
};
export type TabIdsType = (typeof TAB_IDS)[keyof typeof TAB_IDS];
export declare const tabs: ({
    id: "chart";
    name: string;
    disabled: boolean;
} | {
    id: "messages";
    name: string;
    disabled: boolean;
})[];
