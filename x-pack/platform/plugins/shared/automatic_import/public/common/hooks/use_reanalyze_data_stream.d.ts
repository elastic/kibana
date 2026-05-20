import { useMutation } from '@kbn/react-query';
import { type ReanalyzeDataStreamRequest, type ReanalyzeDataStreamResponse } from '../lib/api';
export interface UseReanalyzeDataStreamResult {
    reanalyzeDataStreamMutation: ReturnType<typeof useMutation<ReanalyzeDataStreamResponse, Error, ReanalyzeDataStreamRequest>>;
    isLoading: boolean;
    error: Error | null;
}
/**
 * Hook to re-run the analysis workflow for an existing data stream and sample upload.
 * Statuses are restarted and picked up by the analysis workflow.
 */
export declare function useReanalyzeDataStream(): UseReanalyzeDataStreamResult;
