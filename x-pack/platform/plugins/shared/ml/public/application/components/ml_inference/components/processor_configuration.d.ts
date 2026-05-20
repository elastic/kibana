import type { FC } from 'react';
import React from 'react';
import type { DFAModelItem } from '@kbn/ml-common-types/trained_models';
import type { MlInferenceState, InferenceModelTypes } from '../types';
interface Props {
    condition?: string;
    fieldMap: MlInferenceState['fieldMap'];
    handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
    inferenceConfig: DFAModelItem['inference_config'];
    modelInferenceConfig: DFAModelItem['inference_config'];
    modelInputFields: DFAModelItem['input'];
    modelType?: InferenceModelTypes;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    tag?: string;
}
export declare const ProcessorConfiguration: FC<Props>;
export {};
