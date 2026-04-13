import type { AbsoluteTimeRange } from '@kbn/es-query';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { System, SignificantEventsPreviewResponse } from '@kbn/streams-schema';
export declare function useSignificantEventPreviewFetch({ name, feature, kqlQuery, timeRange, isQueryValid, noOfBuckets, }: {
    noOfBuckets?: number;
    name: string;
    kqlQuery: string;
    feature?: Omit<System, 'description'>;
    timeRange: AbsoluteTimeRange;
    isQueryValid: boolean;
}): AbortableAsyncState<Promise<SignificantEventsPreviewResponse>>;
