import type { FC } from 'react';
import type { MlInferenceState } from '../types';
interface Props {
    condition?: string;
    tag?: string;
    handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
}
export declare const AdditionalAdvancedSettings: FC<Props>;
export {};
