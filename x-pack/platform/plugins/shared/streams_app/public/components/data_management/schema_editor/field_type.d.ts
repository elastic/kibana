import React from 'react';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
export declare const FieldType: ({ type, aliasFor, }: {
    type: FieldDefinitionConfig["type"];
    aliasFor?: string;
}) => React.JSX.Element;
