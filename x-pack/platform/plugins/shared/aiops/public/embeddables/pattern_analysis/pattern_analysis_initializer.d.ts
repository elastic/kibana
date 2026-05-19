import type { FC } from 'react';
import type { PatternAnalysisEmbeddableState } from '../../../common/embeddables/pattern_analysis/types';
export interface PatternAnalysisInitializerProps {
    initialInput?: Partial<PatternAnalysisEmbeddableState>;
    onCreate: (props: PatternAnalysisEmbeddableState) => void;
    onCancel: () => void;
    onPreview: (update: PatternAnalysisEmbeddableState) => Promise<void>;
    isNewPanel: boolean;
}
export declare const PatternAnalysisEmbeddableInitializer: FC<PatternAnalysisInitializerProps>;
export declare const FormControls: FC<{
    formInput: PatternAnalysisEmbeddableState;
    onChange: (update: PatternAnalysisEmbeddableState) => void;
    onValidationChange: (isValid: boolean) => void;
}>;
