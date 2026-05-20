import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Streams } from '@kbn/streams-schema';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { GetScopedClients } from '../../../routes/types';
declare const queryDocumentsSchema: z.ZodObject<{
    name: z.ZodString;
    query: z.ZodString;
    source: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        data: "data";
        failures: "failures";
    }>>>;
}, z.core.$strip>;
export declare const createQueryDocumentsTool: ({ getScopedClients, }: {
    getScopedClients: GetScopedClients;
}) => BuiltinToolDefinition<typeof queryDocumentsSchema>;
export type FieldCapability = 'aggregatable' | 'not aggregatable' | 'source-only';
export interface FieldEntry {
    name: string;
    type: string;
    capability: FieldCapability;
}
export declare const getDefinitionFieldTypes: (definition: Streams.all.Definition) => Map<string, string>;
export declare const classifyFields: ({ fieldCapsFields, sampleHits, definitionFieldTypes, }: {
    fieldCapsFields: Record<string, Record<string, {
        type?: string;
        aggregatable?: boolean;
        metadata_field?: boolean;
    }>>;
    sampleHits: Array<SearchHit<unknown>>;
    definitionFieldTypes: Map<string, string>;
}) => FieldEntry[];
export declare const buildAvailableFieldsPrompt: (fieldEntries: FieldEntry[], maxFields?: number, maxChars?: number) => string;
export declare const computeSearchSize: (translated: {
    aggs?: unknown;
    size?: number;
}) => {
    requestedSize: number;
    cappedSize: number;
};
export declare const flattenAndTruncateDocs: (hits: Array<SearchHit<unknown>>, maxStringLength?: number) => Array<Record<string, unknown>>;
export declare const computeTimestampRange: (documents: Array<Record<string, unknown>>) => {
    oldest: number | null;
    newest: number | null;
};
export declare const isNotFoundError: (err: unknown) => boolean;
export declare const detectEmptyAggregations: (aggregations: Record<string, unknown>, totalHits: number) => string | undefined;
export {};
