import { Streams } from '@kbn/streams-schema';
import type { SchemaEditorField, SchemaField } from '../types';
export declare const useSchemaFields: ({ definition, refreshDefinition, }: {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
}) => {
    fields: SchemaEditorField[];
    storedFields: SchemaField[];
    isLoadingFields: boolean;
    refreshFields: () => void;
    addField: (field: SchemaField) => void;
    updateField: (field: SchemaField) => void;
    pendingChangesCount: number;
    discardChanges: () => void;
    submitChanges: () => Promise<void>;
};
export declare const getDefinitionFields: (definition: Streams.ingest.all.GetResponse) => SchemaField[];
