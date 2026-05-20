import { type ClassificationFeatureImportanceBaseline, type FeatureImportance, type FeatureImportanceBaseline, type TopClasses } from '@kbn/ml-data-frame-analytics-utils';
export type DecisionPathPlotData = Array<[string, number, number]>;
interface UseDecisionPathDataParams {
    featureImportance: FeatureImportance[];
    baseline?: FeatureImportanceBaseline;
    predictedValue?: string | number | undefined;
    predictedProbability?: number | undefined;
    topClasses?: TopClasses;
}
interface RegressionDecisionPathProps {
    baseline?: number;
    predictedValue?: number | undefined;
    featureImportance: FeatureImportance[];
    topClasses?: TopClasses;
}
export declare const isDecisionPathData: (decisionPathData: any) => boolean;
export declare const getStringBasedClassName: (v: string | boolean | undefined | number) => string;
export declare const formatValue: (number: number, precision?: number, fractionDigits?: number) => string;
export declare const useDecisionPathData: ({ baseline, featureImportance, predictedValue, predictedProbability, }: UseDecisionPathDataParams) => {
    decisionPathData: DecisionPathPlotData | undefined;
};
/**
 * Returns values to build decision path for regression jobs
 * where first data point of array is the final predicted value (end of decision path)
 */
export declare const buildRegressionDecisionPathData: ({ baseline, featureImportance, predictedValue, }: RegressionDecisionPathProps) => DecisionPathPlotData | undefined;
export declare const addAdjustedProbability: ({ predictedProbability, decisionPlotData, }: {
    predictedProbability: number | undefined;
    decisionPlotData: DecisionPathPlotData;
}) => DecisionPathPlotData | undefined;
export declare const processBinaryClassificationDecisionPathData: ({ decisionPlotData, startingBaseline, predictedProbability, }: {
    decisionPlotData: DecisionPathPlotData;
    startingBaseline: number;
    predictedProbability: number | undefined;
}) => DecisionPathPlotData | undefined;
export declare const processMultiClassClassificationDecisionPathData: ({ baselines, decisionPlotData, startingBaseline, featureImportance, predictedProbability, }: {
    baselines: ClassificationFeatureImportanceBaseline["classes"];
    decisionPlotData: DecisionPathPlotData;
    startingBaseline: number;
    featureImportance: FeatureImportance[];
    predictedProbability: number | undefined;
}) => DecisionPathPlotData | undefined;
/**
 * Compute the denominator used for multiclass classification
 * (\sum_{x\in{A,B,C}} exp(baseline(x) + \sum_{i=0}^j feature_importance_i(x)))
 */
export declare const computeMultiClassImportanceDenominator: ({ baselines, featureImportance, }: {
    baselines: ClassificationFeatureImportanceBaseline["classes"];
    featureImportance: FeatureImportance[];
}) => number;
/**
 * Returns values to build decision path for classification jobs
 * where first data point of array is the final predicted probability (end of decision path)
 */
export declare const buildClassificationDecisionPathData: ({ baselines, featureImportance, currentClass, predictedProbability, }: {
    baselines: ClassificationFeatureImportanceBaseline["classes"];
    featureImportance: FeatureImportance[];
    currentClass: string | number | boolean | undefined;
    predictedProbability?: number | undefined;
}) => DecisionPathPlotData | undefined;
export {};
