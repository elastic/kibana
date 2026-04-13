import type { StreamDocsStat } from '@kbn/streams-plugin/common';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
export interface StreamDocCountsFetch {
    docCount: Promise<StreamDocsStat[]>;
    failedDocCount: Promise<StreamDocsStat[]>;
    degradedDocCount: Promise<StreamDocsStat[]>;
}
interface UseDocCountFetchProps {
    groupTotalCountByTimestamp: boolean;
    canReadFailureStore: boolean;
    numDataPoints: number;
}
export declare function useStreamDocCountsFetch({ groupTotalCountByTimestamp: _groupTotalCountByTimestamp, canReadFailureStore, numDataPoints, }: UseDocCountFetchProps): {
    getStreamDocCounts(streamName?: string): StreamDocCountsFetch;
    getStreamHistogram(streamName: string): Promise<UnparsedEsqlResponse>;
};
export {};
