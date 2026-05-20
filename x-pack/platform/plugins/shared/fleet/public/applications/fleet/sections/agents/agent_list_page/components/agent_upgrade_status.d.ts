import React from 'react';
import type { Agent } from '../../../../types';
import type { AgentUpgradeDetails } from '../../../../../../../common/types';
/**
 * Returns a user-friendly string for the estimated remaining time until the upgrade is scheduled.
 */
export declare function getUpgradeStartDelay(scheduledAt?: string): string;
export declare function getDownloadEstimate(metadata?: AgentUpgradeDetails['metadata']): string;
export declare const AgentUpgradeStatus: React.FC<{
    isAgentUpgradable: boolean;
    agent: Agent;
    latestAgentVersion?: string;
}>;
