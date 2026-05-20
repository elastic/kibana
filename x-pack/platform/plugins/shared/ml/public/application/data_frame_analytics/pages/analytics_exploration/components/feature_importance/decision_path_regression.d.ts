import type { FC } from 'react';
import type { FeatureImportance, FeatureImportanceBaseline, TopClasses } from '@kbn/ml-data-frame-analytics-utils';
interface RegressionDecisionPathProps {
    predictionFieldName?: string;
    baseline?: FeatureImportanceBaseline;
    predictedValue?: number | undefined;
    featureImportance: FeatureImportance[];
    topClasses?: TopClasses;
}
export declare const RegressionDecisionPath: FC<RegressionDecisionPathProps>;
export {};
