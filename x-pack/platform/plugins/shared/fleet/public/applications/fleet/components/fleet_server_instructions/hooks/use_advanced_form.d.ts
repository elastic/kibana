import type { DeploymentMode } from '../steps';
/**
 * Provides all data/state required for the "advanced" tab in the Fleet Server instructions/flyout
 */
export declare const useAdvancedForm: (defaultAgentPolicyId?: string) => {
    isSelectFleetServerPolicyLoading: boolean;
    eligibleFleetServerPolicies: import("../../../types").EnrollmentSettingsFleetServerPolicy[];
    refreshEligibleFleetServerPolicies: () => void;
    fleetServerPolicyId: string | undefined;
    setFleetServerPolicyId: import("react").Dispatch<import("react").SetStateAction<string | undefined>>;
    isFleetServerReady: boolean;
    serviceToken: string | undefined;
    isLoadingServiceToken: boolean;
    generateServiceToken: (remote?: boolean) => Promise<void>;
    fleetServerHostForm: import("./use_fleet_server_host").FleetServerHostForm;
    deploymentMode: DeploymentMode;
    setDeploymentMode: import("react").Dispatch<import("react").SetStateAction<DeploymentMode>>;
};
