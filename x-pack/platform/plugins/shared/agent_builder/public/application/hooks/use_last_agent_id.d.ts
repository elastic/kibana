/**
 * Reads the last used agent ID for the active space directly from localStorage.
 * Unlike useLastAgentId, this is not a hook and can be called conditionally
 * or inside callbacks to get the current value at call time.
 */
export declare const getLastAgentId: () => string;
export declare const useLastAgentId: () => string;
