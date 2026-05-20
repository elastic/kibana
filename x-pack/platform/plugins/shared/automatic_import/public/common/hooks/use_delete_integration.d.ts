import type { useMutation } from '@kbn/react-query';
import { type DeleteIntegrationRequest } from '../lib/api';
export interface UseDeleteIntegrationResult {
    deleteIntegrationMutation: ReturnType<typeof useMutation<void, Error, DeleteIntegrationRequest>>;
    isLoading: boolean;
    error: Error | null;
}
/**
 * Hook to delete an automatic import integration
 */
export declare function useDeleteIntegration(): UseDeleteIntegrationResult;
