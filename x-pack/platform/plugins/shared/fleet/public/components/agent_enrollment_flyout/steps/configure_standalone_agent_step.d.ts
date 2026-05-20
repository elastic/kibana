import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { K8sMode } from '../types';
export declare const ConfigureStandaloneAgentStep: ({ isK8s, yaml, downloadYaml, apiKey, onCreateApiKey, isCreatingApiKey, isComplete, onCopy, }: {
    isK8s?: K8sMode;
    selectedPolicyId?: string;
    yaml: string;
    downloadYaml: () => void;
    apiKey: string | undefined;
    onCreateApiKey: () => void;
    isCreatingApiKey: boolean;
    isComplete?: boolean;
    onCopy?: () => void;
}) => EuiContainedStepProps;
