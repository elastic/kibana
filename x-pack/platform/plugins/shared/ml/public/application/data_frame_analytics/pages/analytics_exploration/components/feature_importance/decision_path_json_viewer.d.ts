import type { FC } from 'react';
import type { FeatureImportance } from '@kbn/ml-data-frame-analytics-utils';
interface DecisionPathJSONViewerProps {
    featureImportance: FeatureImportance[];
}
export declare const DecisionPathJSONViewer: FC<DecisionPathJSONViewerProps>;
export {};
