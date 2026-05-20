import type { FC } from 'react';
import type { MlInferenceState } from '../ml_inference/types';
interface Props {
    handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
    ignoreFailure: boolean;
    onFailure: MlInferenceState['onFailure'];
    takeActionOnFailure: MlInferenceState['takeActionOnFailure'];
}
export declare const OnFailureConfiguration: FC<Props>;
export {};
