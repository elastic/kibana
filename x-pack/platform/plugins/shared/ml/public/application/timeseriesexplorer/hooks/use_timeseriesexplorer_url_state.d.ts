import type { TimeSeriesExplorerAppState } from '@kbn/ml-common-types/locator';
export declare function useTimeSeriesExplorerUrlState(): [TimeSeriesExplorerAppState, (update: Partial<TimeSeriesExplorerAppState>, replaceState?: boolean) => void, import("@kbn/ml-url-state").UrlStateService<TimeSeriesExplorerAppState>];
