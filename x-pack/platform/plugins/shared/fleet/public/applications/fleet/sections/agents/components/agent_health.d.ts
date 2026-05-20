import React from 'react';
import type { EuiBadgeProps } from '@elastic/eui';
import type { Agent } from '../../../types';
type Props = EuiBadgeProps & {
    agent: Agent;
    fromDetails?: boolean;
};
export declare const AgentHealth: React.FunctionComponent<Props>;
export {};
