import { type StreamQuery, type Streams } from '@kbn/streams-schema';
import React from 'react';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import type { Flow, SaveData } from './types';
interface Props {
    onClose: () => void;
    definition: Streams.all.GetResponse;
    onSave: (data: SaveData) => Promise<void>;
    query?: StreamQuery;
    initialFlow?: Flow;
    generateOnMount: boolean;
    aiFeatures: AIFeatures | null;
}
export declare function AddSignificantEventFlyout({ generateOnMount, query, onClose, definition, onSave, initialFlow, aiFeatures, }: Props): React.JSX.Element;
export {};
