import type { useMutation } from '@kbn/react-query';
import type { CreateAutoImportIntegrationResponse } from '../../../common';
import { type CreateUpdateIntegrationRequest } from '../lib/api';
export interface UseCreateUpdateIntegrationResult {
    createUpdateIntegrationMutation: ReturnType<typeof useMutation<CreateAutoImportIntegrationResponse, Error, CreateUpdateIntegrationRequest>>;
    isLoading: boolean;
    error: Error | null;
}
/**
 * Hook to create or update an integration with data streams.
 * Uses React Query for mutation management with automatic cache invalidation.
 * Navigates to the edit page after successful creation/update.
 */
export declare function useCreateUpdateIntegration(): UseCreateUpdateIntegrationResult;
