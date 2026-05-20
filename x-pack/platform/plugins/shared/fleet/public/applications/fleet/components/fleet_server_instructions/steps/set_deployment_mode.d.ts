import type { EuiStepProps } from '@elastic/eui';
export type DeploymentMode = 'production' | 'quickstart';
export declare const getSetDeploymentModeStep: ({ deploymentMode, setDeploymentMode, disabled, }: {
    deploymentMode: DeploymentMode;
    setDeploymentMode: (v: DeploymentMode) => void;
    disabled: boolean;
}) => EuiStepProps;
