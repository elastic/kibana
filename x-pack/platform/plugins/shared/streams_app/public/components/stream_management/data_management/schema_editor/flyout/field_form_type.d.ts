import React from 'react';
import type { FieldTypeOption } from '../constants';
import type { SchemaField } from '../types';
/**
 * Returns a filtered and alphabetically sorted (by display label) list of field type options.
 * Excludes readonly types and conditionally excludes geo_point based on stream type and feature flag.
 */
export declare const getFieldTypeOptions: ({ streamType, enableGeoPointSuggestions, }: {
    streamType: "classic" | "wired";
    enableGeoPointSuggestions?: boolean;
}) => FieldTypeOption[];
interface FieldFormTypeProps {
    field: SchemaField;
    isEditing: boolean;
    onTypeChange: FieldTypeSelectorProps['onChange'];
    streamType: 'classic' | 'wired';
    enableGeoPointSuggestions?: boolean;
}
export declare const FieldFormType: ({ field, isEditing, onTypeChange, streamType, enableGeoPointSuggestions, }: FieldFormTypeProps) => React.JSX.Element;
interface FieldTypeSelectorProps {
    isLoading?: boolean;
    onChange: (value: FieldTypeOption) => void;
    value?: FieldTypeOption;
    streamType: 'classic' | 'wired';
    enableGeoPointSuggestions?: boolean;
}
export declare const FieldTypeSelector: ({ value, onChange, isLoading, streamType, enableGeoPointSuggestions, }: FieldTypeSelectorProps) => React.JSX.Element;
export {};
