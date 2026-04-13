import type { StreamQuery } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
interface Props {
    isGenerating: boolean;
    isBeingCanceled: boolean;
    isSchedulingGenerationTask: boolean;
    generatedQueries: StreamQuery[];
    onEditQuery: (query: StreamQuery) => void;
    stopGeneration: () => void;
    definition: Streams.all.Definition;
    isSubmitting: boolean;
    setQueries: (queries: StreamQuery[]) => void;
    setCanSave: (canSave: boolean) => void;
    dataViews: DataView[];
    taskStatus?: string;
    taskError?: string;
}
export declare function GeneratedFlowForm({ isGenerating, isBeingCanceled, isSchedulingGenerationTask, generatedQueries, onEditQuery, stopGeneration, setQueries, definition, setCanSave, isSubmitting, dataViews, taskStatus, taskError, }: Props): React.JSX.Element;
export {};
