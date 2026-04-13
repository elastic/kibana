import React from 'react';
import { Streams } from '@kbn/streams-schema';
import type { SchemaField } from '../types';
interface FieldSummaryProps {
    field: SchemaField;
    isEditing: boolean;
    toggleEditMode: () => void;
    stream: Streams.ingest.all.Definition;
    onChange: (field: Partial<SchemaField>) => void;
    enableGeoPointSuggestions?: boolean;
    onGoToField?: (fieldName: string) => void;
}
export declare const FieldSummary: (props: FieldSummaryProps) => React.JSX.Element;
export {};
