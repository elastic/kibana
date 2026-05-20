import { useMutation } from '@kbn/react-query';
import type { GetDataStreamResultsResponse, UpdateDataStreamPipelineRequest } from '../lib/api';
export interface UseUpdateDataStreamPipelineResult {
    updateDataStreamPipelineMutation: ReturnType<typeof useMutation<GetDataStreamResultsResponse, Error, UpdateDataStreamPipelineRequest>>;
    isLoading: boolean;
    error: Error | null;
}
export declare function useUpdateDataStreamPipeline(): UseUpdateDataStreamPipelineResult;
