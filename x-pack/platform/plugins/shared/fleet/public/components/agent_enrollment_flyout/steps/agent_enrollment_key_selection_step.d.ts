import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { AgentPolicy } from '../../../types';
export declare const AgentEnrollmentKeySelectionStep: ({ selectedPolicy, selectedApiKeyId, setSelectedAPIKeyId, }: {
    selectedPolicy?: AgentPolicy;
    selectedApiKeyId?: string;
    setSelectedAPIKeyId: (key?: string) => void;
}) => EuiContainedStepProps;
