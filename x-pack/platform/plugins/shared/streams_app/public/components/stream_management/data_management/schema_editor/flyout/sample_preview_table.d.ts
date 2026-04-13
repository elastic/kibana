import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { SchemaField } from '../types';
interface SamplePreviewTableProps {
    stream: Streams.ingest.all.Definition;
    nextField: SchemaField;
    onValidate?: ({ isValid, isIgnored, isExpensiveQueries, }: {
        isValid: boolean;
        isIgnored: boolean;
        isExpensiveQueries: boolean;
    }) => void;
}
export declare const SamplePreviewTable: (props: SamplePreviewTableProps) => React.JSX.Element | null;
export {};
