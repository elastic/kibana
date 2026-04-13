import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import type { MappedSchemaField, SchemaEditorField, SchemaField } from './types';
export declare const getGeoPointSuggestion: ({ fieldName, fields, streamType, }: {
    fieldName: string;
    fields?: SchemaEditorField[];
    streamType: "classic" | "wired";
}) => {
    base: string;
} | null;
export declare const convertToFieldDefinitionConfig: (field: MappedSchemaField) => FieldDefinitionConfig;
export declare function isFieldUncommitted(field: SchemaEditorField, storedFields: SchemaEditorField[]): boolean;
export declare const buildSchemaSavePayload: (definition: Streams.ingest.all.GetResponse, fields: SchemaField[]) => {
    ingest: IngestUpsertRequest;
};
