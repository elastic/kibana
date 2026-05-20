import React from 'react';
import type { EuiLinkAnchorProps } from '@elastic/eui';
/**
 * Displays the provided `count` number as a link to the Agents list if it is greater than zero
 */
export declare const LinkedAgentCount: React.NamedExoticComponent<Omit<EuiLinkAnchorProps, "href"> & {
    count: number;
    agentPolicyId: string;
    showAgentText?: boolean;
    privilegeMode?: "privileged" | "unprivileged";
}>;
