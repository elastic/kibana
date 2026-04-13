import type { StreamQuery, Streams } from '@kbn/streams-schema';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
interface Props {
    definition: Streams.all.Definition;
    generatedQueries: StreamQuery[];
    setIsEditingQueries: (isEditingQueries: boolean) => void;
    onEditQuery: (query: StreamQuery) => void;
    selectedQueries: StreamQuery[];
    isSubmitting: boolean;
    onSelectionChange: (selectedItems: StreamQuery[]) => void;
    dataViews: DataView[];
}
export declare function SignificantEventsGeneratedTable({ generatedQueries, onEditQuery, setIsEditingQueries, selectedQueries, onSelectionChange, definition, isSubmitting, dataViews, }: Props): React.JSX.Element;
export {};
