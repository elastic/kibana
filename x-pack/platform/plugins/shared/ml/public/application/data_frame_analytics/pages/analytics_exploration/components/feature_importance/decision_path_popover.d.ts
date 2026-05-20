import type { FC } from 'react';
import { type DataFrameAnalysisConfigType, type FeatureImportance, type FeatureImportanceBaseline, type TopClasses } from '@kbn/ml-data-frame-analytics-utils';
interface DecisionPathPopoverProps {
    featureImportance: FeatureImportance[];
    analysisType: DataFrameAnalysisConfigType;
    predictionFieldName?: string;
    baseline?: FeatureImportanceBaseline;
    predictedValue?: number | string | undefined;
    predictedProbability?: number;
    topClasses?: TopClasses;
}
export interface ExtendedFeatureImportance extends FeatureImportance {
    absImportance: number;
}
export declare const DecisionPathPopover: FC<DecisionPathPopoverProps>;
export {};
