import type { AllIntegrationsResponseIntegration } from '../../../common';
export interface UseGetAllIntegrationsResult {
    integrations: AllIntegrationsResponseIntegration[];
    isInitialLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}
/**
 * Hook to fetch all created integrations from the automatic_import backend.
 */
export declare function useGetAllIntegrations(): UseGetAllIntegrationsResult;
