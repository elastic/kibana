import type { FC } from 'react';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { MinimumTimeRangeOption } from '../../../common/embeddables/pattern_analysis/types';
interface PatternAnalysisFormInput {
    fieldName?: string;
    minimumTimeRangeOption: MinimumTimeRangeOption;
    randomSamplerMode: PatternAnalysisEmbeddableState['random_sampler_mode'];
    randomSamplerProbability: PatternAnalysisEmbeddableState['random_sampler_probability'];
}
export interface PatternAnalysisInitializerProps {
    initialInput?: Partial<PatternAnalysisEmbeddableState>;
    onCreate: (props: PatternAnalysisEmbeddableState) => void;
    onCancel: () => void;
    onPreview?: (update: PatternAnalysisEmbeddableState) => Promise<void>;
    isNewPanel: boolean;
}
export declare const PatternAnalysisEmbeddableInitializer: FC<PatternAnalysisInitializerProps>;
export declare const FormControls: FC<{
    dataViewId: string;
    formInput: PatternAnalysisFormInput;
    onChange: (update: PatternAnalysisFormInput) => void;
    onValidationChange: (isValid: boolean) => void;
}>;
export {};
