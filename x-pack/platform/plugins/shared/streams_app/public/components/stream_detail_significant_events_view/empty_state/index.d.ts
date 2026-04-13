import React from 'react';
import type { AIFeatures } from '../../../hooks/use_ai_features';
export declare function EmptyState({ onManualEntryClick, onGenerateSuggestionsClick, aiFeatures, }: {
    onManualEntryClick: () => void;
    onGenerateSuggestionsClick: () => void;
    aiFeatures: AIFeatures | null;
}): React.JSX.Element;
