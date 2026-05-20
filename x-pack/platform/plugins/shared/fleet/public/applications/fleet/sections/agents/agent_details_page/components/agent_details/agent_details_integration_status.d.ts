import React from 'react';
import type { Agent, PackagePolicy } from '../../../../../types';
import { type InputStatusFormatter } from './input_status_utils';
export declare const AgentDetailsIntegrationStatus: React.FunctionComponent<{
    agent: Agent;
    packagePolicy: PackagePolicy;
    itemStatusMap: Map<string, InputStatusFormatter>;
    itemType: 'Input' | 'Output';
    outputName?: string;
    linkToLogs?: boolean;
    'data-test-subj'?: string;
}>;
