import type { SavedObjectsClientContract } from '@kbn/core/server';
export interface IntegrationsDetails {
    total_integration_policies: number;
    shared_integration_policies: number;
    shared_integrations: SharedIntegration;
}
interface SharedIntegration {
    name: string;
    shared_by_agent_policies: number;
    pkg_name?: string;
    pkg_version?: string;
    agents?: number;
}
export declare const getIntegrationsDetails: (soClient?: SavedObjectsClientContract) => Promise<IntegrationsDetails[]>;
export {};
