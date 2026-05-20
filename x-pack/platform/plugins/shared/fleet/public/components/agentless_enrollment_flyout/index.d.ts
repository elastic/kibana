import React from 'react';
import type { AgentPolicy, PackagePolicy } from '../../types';
/**
 * This component displays additional status details of an agentless agent enrolled
 * the chosen package policy (and its agent policy).
 * It also displays confirmation that the agentless agent is ingesting data from
 * the chosen package policy.
 */
export declare const AgentlessEnrollmentFlyout: ({ onClose, packagePolicy, agentPolicy, }: {
    onClose: () => void;
    packagePolicy: PackagePolicy;
    agentPolicy?: AgentPolicy;
}) => React.JSX.Element;
