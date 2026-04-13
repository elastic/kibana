import type { Streams } from '@kbn/streams-schema';
import React from 'react';
interface QueryStreamSchemaEditorProps {
    definition: Streams.QueryStream.GetResponse;
    refreshDefinition: () => void;
}
export declare const QueryStreamSchemaEditor: ({ definition, refreshDefinition, }: QueryStreamSchemaEditorProps) => React.JSX.Element;
export {};
