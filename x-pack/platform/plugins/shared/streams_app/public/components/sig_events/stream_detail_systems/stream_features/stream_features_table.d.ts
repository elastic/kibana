import React from 'react';
import type { Feature, Streams } from '@kbn/streams-schema';
interface StreamFeaturesTableProps {
    definition: Streams.all.Definition;
    isLoadingFeatures: boolean;
    features: Feature[];
    refreshFeatures: () => void;
    isIdentifyingFeatures: boolean;
    selectedFeature: Feature | null;
    onSelectFeature: (feature: Feature | null) => void;
}
export declare function StreamFeaturesTable({ definition, isLoadingFeatures, features, refreshFeatures, isIdentifyingFeatures, selectedFeature, onSelectFeature, }: StreamFeaturesTableProps): React.JSX.Element;
export {};
