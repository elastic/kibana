import React from 'react';
import type { GetFleetStatusResponse } from '../types';
export interface FleetStatusProviderProps {
    enabled: boolean;
    isLoading: boolean;
    isReady: boolean;
    error?: Error;
    missingRequirements?: GetFleetStatusResponse['missing_requirements'];
    missingOptionalFeatures?: GetFleetStatusResponse['missing_optional_features'];
    isSecretsStorageEnabled?: GetFleetStatusResponse['is_secrets_storage_enabled'];
    isSpaceAwarenessEnabled?: GetFleetStatusResponse['is_space_awareness_enabled'];
    isSSLSecretsStorageEnabled?: GetFleetStatusResponse['is_ssl_secrets_storage_enabled'];
    isActionSecretsStorageEnabled?: GetFleetStatusResponse['is_action_secrets_storage_enabled'];
    spaceId?: string;
}
interface FleetStatus extends FleetStatusProviderProps {
    refetch: () => Promise<unknown>;
    forceDisplayInstructions: boolean;
    setForceDisplayInstructions: React.Dispatch<boolean>;
}
export declare const FleetStatusProvider: React.FC<{
    children: React.ReactNode;
    defaultFleetStatus?: FleetStatusProviderProps;
}>;
export declare function useFleetStatus(): FleetStatus;
export {};
