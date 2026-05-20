import React from 'react';
import type { JsonArray, JsonValue } from '@kbn/utility-types';
export declare const FieldValue: React.FC<{
    highlightTerms: string[];
    isActiveHighlight: boolean;
    value: JsonArray;
    render?: (value: JsonValue) => React.ReactNode;
}>;
