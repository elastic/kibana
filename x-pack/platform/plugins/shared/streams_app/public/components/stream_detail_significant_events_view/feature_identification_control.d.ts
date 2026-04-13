import React from 'react';
import { type Streams } from '@kbn/streams-schema';
import type { AIFeatures } from '../../hooks/use_ai_features';
interface FeatureIdentificationControlProps {
    definition: Streams.all.Definition;
    refreshFeatures: () => void;
    aiFeatures: AIFeatures | null;
    isIdentifyingFeatures: boolean;
    onTaskStart: () => void;
    onTaskEnd: () => void;
}
export declare function FeatureIdentificationControl({ definition, refreshFeatures, aiFeatures, isIdentifyingFeatures, onTaskStart, onTaskEnd, }: FeatureIdentificationControlProps): React.JSX.Element | null;
export {};
