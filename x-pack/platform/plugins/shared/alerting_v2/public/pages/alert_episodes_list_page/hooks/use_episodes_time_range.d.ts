import type { TimefilterContract } from '@kbn/data-plugin/public';
type InputTimeRange = Parameters<TimefilterContract['setTime']>[0];
export declare const useEpisodesTimeRange: (timefilter: TimefilterContract) => {
    timeRange: import("@kbn/es-query").TimeRange;
    handleTimeChange: (range: InputTimeRange) => void;
};
export {};
