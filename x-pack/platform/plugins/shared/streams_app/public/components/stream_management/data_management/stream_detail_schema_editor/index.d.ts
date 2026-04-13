import { Streams } from '@kbn/streams-schema';
import React from 'react';
interface SchemaEditorProps {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
}
export declare const StreamDetailSchemaEditor: ({ definition, refreshDefinition }: SchemaEditorProps) => React.JSX.Element;
export {};
