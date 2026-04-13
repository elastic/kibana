import React from 'react';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import type { SchemaField } from '../types';
interface FieldFormFormatProps {
    value: SchemaField['format'];
    onChange: (format: SchemaField['format']) => void;
}
export declare const typeSupportsFormat: (type?: FieldDefinitionConfig["type"]) => boolean;
export declare const FieldFormFormat: ({ value, onChange }: FieldFormFormatProps) => React.JSX.Element;
export {};
