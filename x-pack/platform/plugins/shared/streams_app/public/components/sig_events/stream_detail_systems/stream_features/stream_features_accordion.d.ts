import React from 'react';
import type { Feature, Streams } from '@kbn/streams-schema';
interface StreamFeaturesAccordionProps {
    definition: Streams.all.Definition;
    features: Feature[];
    isLoadingFeatures: boolean;
    refreshFeatures: () => void;
    isIdentifyingFeatures: boolean;
    selectedFeature: Feature | null;
    onSelectFeature: (feature: Feature | null) => void;
}
export declare const StreamFeaturesAccordion: ({ definition, features, isLoadingFeatures, refreshFeatures, isIdentifyingFeatures, selectedFeature, onSelectFeature, }: StreamFeaturesAccordionProps) => React.JSX.Element;
export {};
