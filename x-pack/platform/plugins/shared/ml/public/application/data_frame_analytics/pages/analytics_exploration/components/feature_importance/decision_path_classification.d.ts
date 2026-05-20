import type { FC } from 'react';
import type { FeatureImportance, FeatureImportanceBaseline, TopClasses } from '@kbn/ml-data-frame-analytics-utils';
interface ClassificationDecisionPathProps {
    predictedValue: string | boolean;
    predictedProbability: number | undefined;
    predictionFieldName?: string;
    featureImportance: FeatureImportance[];
    topClasses: TopClasses;
    baseline?: FeatureImportanceBaseline;
}
export declare const ClassificationDecisionPath: FC<ClassificationDecisionPathProps>;
export {};
