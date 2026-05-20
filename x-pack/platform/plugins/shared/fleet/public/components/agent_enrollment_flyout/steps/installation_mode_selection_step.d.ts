import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { FlyoutMode } from '../types';
export declare const InstallationModeSelectionStep: ({ selectedPolicyId, mode, setMode, }: {
    selectedPolicyId: string | undefined;
    mode: FlyoutMode;
    setMode: (v: FlyoutMode) => void;
}) => EuiContainedStepProps;
