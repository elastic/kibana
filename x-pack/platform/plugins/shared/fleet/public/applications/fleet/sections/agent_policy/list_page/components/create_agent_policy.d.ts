import React from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import type { AgentPolicy } from '../../../../types';
interface Props extends Omit<EuiFlyoutProps, 'onClose'> {
    onClose: (createdAgentPolicy?: AgentPolicy) => void;
}
export declare const CreateAgentPolicyFlyout: React.FunctionComponent<Props>;
export {};
