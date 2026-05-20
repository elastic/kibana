import type { FunctionComponent } from 'react';
import React from 'react';
interface AgentPolicyContextValue {
    getId(): string | undefined;
}
export declare const AgentPolicyContextProvider: FunctionComponent<{
    children?: React.ReactNode;
}>;
export declare const useAgentPolicyContext: () => AgentPolicyContextValue;
export {};
