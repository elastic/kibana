import type { useMutation } from '@kbn/react-query';
import type { UploadSamplesToDataStreamResponse } from '../../../common/model/api/data_streams/data_stream.gen';
import { type UploadSamplesRequest } from '../lib/api';
export interface UseUploadSamplesResult {
    uploadSamplesMutation: ReturnType<typeof useMutation<UploadSamplesToDataStreamResponse, Error, UploadSamplesRequest>>;
    isLoading: boolean;
    error: Error | null;
}
/**
 * Hook to upload log samples to a data stream before triggering analysis.
 * Uses React Query for mutation management.
 * This should be called before the form is submitted to upload samples
 * that will be available for the "Analyze Logs" button.
 */
export declare function useUploadSamples(): UseUploadSamplesResult;
