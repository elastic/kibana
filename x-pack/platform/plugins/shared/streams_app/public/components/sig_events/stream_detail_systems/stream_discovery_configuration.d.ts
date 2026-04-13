import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { AIFeatures } from '../../hooks/use_ai_features';
interface StreamDiscoveryConfigurationProps {
    definition: Streams.all.Definition;
    aiFeatures: AIFeatures | null;
}
export declare function StreamDiscoveryConfiguration({ definition, aiFeatures, }: StreamDiscoveryConfigurationProps): React.JSX.Element;
export {};
