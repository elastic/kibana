import React from 'react';
import { type FeatureImportanceBaseline } from '@kbn/ml-data-frame-analytics-utils';
import type { DecisionPathPlotData } from './use_classification_path_data';
interface DecisionPathChartProps {
    decisionPathData: DecisionPathPlotData;
    predictionFieldName?: string;
    baseline?: FeatureImportanceBaseline;
    minDomain: number | undefined;
    maxDomain: number | undefined;
}
export declare const DecisionPathChart: ({ decisionPathData, predictionFieldName, minDomain, maxDomain, baseline, }: DecisionPathChartProps) => React.JSX.Element;
export {};
