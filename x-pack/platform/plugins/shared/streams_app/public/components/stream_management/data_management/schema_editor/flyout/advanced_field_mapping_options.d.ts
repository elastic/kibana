import React from 'react';
import type { SchemaField } from '../types';
export declare const AdvancedFieldMappingOptions: ({ value, onChange, onValidate, isEditing, }: {
    value: SchemaField["additionalParameters"];
    onChange: (additionalParameters: SchemaField["additionalParameters"]) => void;
    onValidate?: (isValid: boolean) => void;
    isEditing: boolean;
}) => React.JSX.Element;
