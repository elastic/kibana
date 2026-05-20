import type { GetDataStreamResultsResponse } from '../lib/api';
export interface UseGetDataStreamResultsResult {
    data: GetDataStreamResultsResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}
/**
 * Hook to fetch data stream results (ingest pipeline and processed documents) from the automatic_import backend.
 */
export declare function useGetDataStreamResults(integrationId: string | undefined, dataStreamId: string | undefined): UseGetDataStreamResultsResult;
