import type { IntegrationResponse } from '../../../common';
export interface UseGetIntegrationByIdResult {
    integration: IntegrationResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}
/**
 * Hook to fetch a single integration by ID from the automatic_import backend.
 */
export declare function useGetIntegrationById(integrationId: string | undefined): UseGetIntegrationByIdResult;
