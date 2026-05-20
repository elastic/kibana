import type { Capabilities } from '@kbn/core-capabilities-common';
export type TransformPrivilege = 'canGetTransform' | 'canCreateTransform' | 'canDeleteTransform' | 'canStartStopTransform';
export interface FleetAuthz {
    fleet: {
        all: boolean;
        setup: boolean;
        readEnrollmentTokens: boolean;
        readAgentPolicies: boolean;
        allAgentPolicies: boolean;
        readAgents: boolean;
        allAgents: boolean;
        readSettings: boolean;
        allSettings: boolean;
        generateAgentReports: boolean;
        addAgents: boolean;
        addFleetServers: boolean;
    };
    integrations: {
        all: boolean;
        readPackageInfo: boolean;
        readInstalledPackages: boolean;
        installPackages: boolean;
        upgradePackages: boolean;
        removePackages: boolean;
        uploadPackages: boolean;
        readPackageSettings: boolean;
        writePackageSettings: boolean;
        readIntegrationPolicies: boolean;
        writeIntegrationPolicies: boolean;
    };
    packagePrivileges?: {
        [packageName: string]: {
            actions: {
                [key: string]: {
                    executePackageAction: boolean;
                };
            };
        };
    };
    endpointExceptionsPrivileges?: {
        actions: {
            crudEndpointExceptions: boolean;
            showEndpointExceptions: boolean;
        };
    };
}
interface ReadAllParams {
    all: boolean;
    read: boolean;
}
interface CalculateParams {
    fleet: {
        all: boolean;
        setup: boolean;
        read?: boolean;
        agents?: ReadAllParams;
        agentPolicies?: ReadAllParams;
        settings?: ReadAllParams;
        generateReports?: Omit<ReadAllParams, 'read'>;
    };
    integrations: ReadAllParams;
}
export declare const calculateAuthz: ({ fleet, integrations }: CalculateParams) => FleetAuthz;
export declare function calculatePackagePrivilegesFromCapabilities(capabilities: Capabilities | undefined): FleetAuthz['packagePrivileges'];
export declare function calculateEndpointExceptionsPrivilegesFromCapabilities(capabilities: Capabilities | undefined): FleetAuthz['endpointExceptionsPrivileges'];
export declare function getAuthorizationFromPrivileges({ kibanaPrivileges, searchPrivilege, prefix, }: {
    kibanaPrivileges: Array<{
        resource?: string;
        privilege: string;
        authorized: boolean;
    }>;
    prefix?: string;
    searchPrivilege?: string;
}): boolean;
export declare function calculatePackagePrivilegesFromKibanaPrivileges(kibanaPrivileges: Array<{
    resource?: string;
    privilege: string;
    authorized: boolean;
}> | undefined): FleetAuthz['packagePrivileges'];
export declare function calculateEndpointExceptionsPrivilegesFromKibanaPrivileges(kibanaPrivileges: Array<{
    resource?: string;
    privilege: string;
    authorized: boolean;
}> | undefined): FleetAuthz['endpointExceptionsPrivileges'];
export {};
