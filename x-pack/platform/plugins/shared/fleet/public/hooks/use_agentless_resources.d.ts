/**
 * Hook to manage the agentless resources toggle state
 * @returns object with current state and setter function
 */
export declare function useAgentlessResources(): {
    showAgentless: boolean;
    setShowAgentless: (enabled: boolean) => void;
};
