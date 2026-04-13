import React from 'react';
import type { Flow } from './add_significant_event_flyout/types';
import type { AIFeatures } from '../../hooks/use_ai_features';
export declare function SignificantEventsGenerationPanel({ onGenerateSuggestionsClick, onManualEntryClick, isGeneratingQueries, isSavingManualEntry, selectedFlow, aiFeatures, }: {
    onManualEntryClick: () => void;
    onGenerateSuggestionsClick: () => void;
    isGeneratingQueries: boolean;
    isSavingManualEntry: boolean;
    selectedFlow?: Flow;
    aiFeatures: AIFeatures | null;
}): React.JSX.Element;
