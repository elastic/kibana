import React from 'react';
import { Streams } from '@kbn/streams-schema';
import type { SchemaField } from '../types';
export interface SchemaEditorFlyoutProps {
    field: SchemaField;
    isEditingByDefault?: boolean;
    applyGeoPointSuggestion?: boolean;
    onClose: () => void;
    onStage: (field: SchemaField) => void;
    stream: Streams.ingest.all.Definition;
    withFieldSimulation?: boolean;
    fields?: SchemaField[];
    enableGeoPointSuggestions?: boolean;
    onGoToField?: (fieldName: string) => void;
}
export declare const SchemaEditorFlyout: ({ field, stream, onClose, onStage, isEditingByDefault, applyGeoPointSuggestion: applyGeoPointSuggestionProp, withFieldSimulation, fields, enableGeoPointSuggestions, onGoToField, }: SchemaEditorFlyoutProps) => React.JSX.Element;
