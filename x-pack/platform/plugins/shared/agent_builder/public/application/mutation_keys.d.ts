/**
 * Mutation keys for react-query
 */
export declare const mutationKeys: {
    sendMessage: readonly ["sendMessage"];
    resumeRound: readonly ["resumeRound"];
    updateAgentAccessControl: (agentId: string) => readonly ["agentProfiles", string, "accessControl", "update"];
};
