export declare const useSelectFleetServerPolicy: (defaultAgentPolicyId?: string) => {
    isSelectFleetServerPolicyLoading: boolean;
    fleetServerPolicyId: string | undefined;
    setFleetServerPolicyId: import("react").Dispatch<import("react").SetStateAction<string | undefined>>;
    eligibleFleetServerPolicies: import("../../../types").EnrollmentSettingsFleetServerPolicy[];
    refreshEligibleFleetServerPolicies: () => void;
};
