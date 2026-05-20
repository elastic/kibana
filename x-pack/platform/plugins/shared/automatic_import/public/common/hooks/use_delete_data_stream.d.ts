import { useMutation } from '@kbn/react-query';
import { type DeleteDataStreamRequest } from '../lib/api';
export interface UseDeleteDataStreamResult {
    deleteDataStreamMutation: ReturnType<typeof useMutation<void, Error, DeleteDataStreamRequest>>;
    isLoading: boolean;
    error: Error | null;
}
/**
 * Hook to delete a data stream from an integration.
 * Uses React Query for mutation management with optimistic updates.
 * Immediately sets the data stream status to 'deleting' in the cache,
 * ensuring consistent UI even when multiple deletes are in progress.
 */
export declare function useDeleteDataStream(): UseDeleteDataStreamResult;
