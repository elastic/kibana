import type { DataView } from '@kbn/data-views-plugin/public';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import React from 'react';
interface Props {
    definition: Streams.all.Definition;
    query: StreamQuery;
    isSubmitting: boolean;
    isEditMode: boolean;
    setQuery: (query: StreamQuery) => void;
    setCanSave: (canSave: boolean) => void;
    dataViews: DataView[];
}
export declare function ManualFlowForm({ definition, query, setQuery, setCanSave, isSubmitting, isEditMode, dataViews, }: Props): React.JSX.Element;
export {};
