import type { StreamQuery, Streams } from '@kbn/streams-schema';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
interface GeneratedEventPreviewProps {
    definition: Streams.all.Definition;
    query: StreamQuery;
    onSave: (query: StreamQuery) => void;
    dataViews: DataView[];
    isEditing: boolean;
    setIsEditing: (isEditing: boolean) => void;
}
export declare function GeneratedEventPreview({ definition, query: initialQuery, isEditing, setIsEditing, onSave, dataViews, }: GeneratedEventPreviewProps): React.JSX.Element;
export {};
