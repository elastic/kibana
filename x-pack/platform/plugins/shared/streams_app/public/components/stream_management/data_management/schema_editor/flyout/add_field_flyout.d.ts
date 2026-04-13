import React from 'react';
import type { SchemaField } from '../types';
export interface AddFieldFlyoutProps {
    onClose: () => void;
    onAddField: (field: SchemaField) => void;
}
export declare const AddFieldButton: ({ onAddField }: Pick<AddFieldFlyoutProps, "onAddField">) => React.JSX.Element;
export declare const AddFieldFlyout: ({ onAddField, onClose }: AddFieldFlyoutProps) => React.JSX.Element;
export declare const FieldNameSelector: () => React.JSX.Element;
export declare const FieldTypeSelector: () => React.JSX.Element;
export declare const FieldFormatSelector: () => React.JSX.Element;
export declare const AdvancedFieldMappingEditor: () => React.JSX.Element;
