export interface UseAgentBuilderAvailability {
    isAgentBuilderAvailable: boolean;
    hasAgentBuilderPrivilege: boolean;
    isAgentChatExperienceEnabled: boolean;
    hasValidAgentBuilderLicense: boolean;
}
export declare const useAgentBuilderAvailability: () => UseAgentBuilderAvailability;
