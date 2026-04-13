import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import type { AIFeatures } from '../../hooks/use_ai_features';
export interface AISummaryProps {
    definition: Streams.all.GetResponse;
    refreshDefinition: () => void;
    aiFeatures: AIFeatures | null;
}
export declare const StreamDescription: React.FC<AISummaryProps>;
