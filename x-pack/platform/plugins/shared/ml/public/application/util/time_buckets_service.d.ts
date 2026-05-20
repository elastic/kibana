import type { IUiSettingsClient } from '@kbn/core/public';
import { type TimeRangeBounds, type TimeBucketsInterval, TimeBuckets } from '@kbn/ml-time-buckets';
export declare function timeBucketsServiceFactory(uiSettings: IUiSettingsClient): {
    getTimeBuckets: () => InstanceType<typeof TimeBuckets>;
    getBoundsRoundedToInterval: (bounds: TimeRangeBounds, interval: TimeBucketsInterval, inclusiveEnd?: boolean) => Required<TimeRangeBounds>;
};
export type TimeBucketsService = ReturnType<typeof timeBucketsServiceFactory>;
export declare function useTimeBucketsService(): TimeBucketsService;
