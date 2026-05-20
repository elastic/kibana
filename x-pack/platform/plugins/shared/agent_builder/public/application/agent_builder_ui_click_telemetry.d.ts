import React, { type ReactNode } from 'react';
/**
 * Capture-phase `click` on `document` so portaled EUI panels resolve; only runs when the
 * scoped router is on an Agent Builder path. `resolveAgentBuilderUiClickPayload` further
 * restricts to the mount subtree or DOM carrying the `agentBuilder.` EBT contract.
 */
export declare const AgentBuilderUiClickTelemetry: React.FC<{
    children: ReactNode;
}>;
