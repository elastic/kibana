export interface UseIsAgentBuilderEnabledResult {
    /**
     * True when the Agent Builder experience is enabled for the user.
     * This requires:
     * - Chat experience being set to Agent
     * - Agent Builder capability (RBAC) enabled
     */
    isAgentBuilderEnabled: boolean;
    /**
     * True when the user has the Agent Builder capability (RBAC).
     */
    hasAgentBuilderAccess: boolean;
    /**
     * True when the preferred chat experience is set to Agent.
     */
    isAgentChatExperienceEnabled: boolean;
}
export declare const useIsAgentBuilderEnabled: () => UseIsAgentBuilderEnabledResult;
