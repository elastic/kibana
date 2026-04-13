import React from 'react';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import type { Flow } from './types';
export declare const EditSignificantEventFlyout: ({ queryToEdit, definition, isEditFlyoutOpen, setIsEditFlyoutOpen, initialFlow, setQueryToEdit, refresh, generateOnMount, aiFeatures, }: {
    refresh: () => void;
    setQueryToEdit: React.Dispatch<React.SetStateAction<StreamQuery | undefined>>;
    initialFlow?: Flow;
    queryToEdit?: StreamQuery;
    definition: Streams.all.GetResponse;
    isEditFlyoutOpen: boolean;
    setIsEditFlyoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
    generateOnMount: boolean;
    aiFeatures: AIFeatures | null;
}) => React.JSX.Element | null;
