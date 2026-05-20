import type { z } from '@kbn/zod/v4';
import type { StreamType } from '../../types/streamlang';
/**
 * JSON Schema produced by Zod v4's native `z.toJSONSchema()`. The output is a
 * flat JSON Schema object (no `definitions` wrapper). We use a loose record
 * type here since the downstream fixup pipeline accesses fields dynamically.
 */
type StreamlangJsonSchema = Record<string, unknown>;
/**
 * Convert the Streamlang Zod schema into JSON Schema and run our fixup pipeline
 * so the result is consumable by Monaco YAML and other validation tooling.
 *
 * Uses Zod v4's native `z.toJSONSchema()` for the conversion. The fixup
 * pipeline enforces strict `additionalProperties` and enhances the schema
 * with editor-friendly metadata (titles, snippets, etc.).
 *
 * @param streamlangSchema - The Zod schema to convert
 * @param streamType - Optional stream type to filter available actions (e.g., exclude manual_ingest_pipeline for wired streams)
 */
export declare function getJsonSchemaFromStreamlangSchema(streamlangSchema: z.ZodType, streamType?: StreamType): StreamlangJsonSchema;
/**
 * Get Monaco YAML schema configuration for the standalone condition editor.
 *
 * This generates a JSON Schema from the condition Zod schema and applies
 * the same fixups used for the full Streamlang schema (enum dedup,
 * additionalProperties enforcement) plus condition-specific transforms
 * (anyOf flattening, operator snippets).
 *
 * @returns Schema configuration object for monaco-yaml, or null if generation fails
 */
export declare function getConditionMonacoSchemaConfig(): {
    uri: string;
    fileMatch: string[];
    schema: Record<string, unknown>;
} | null;
export {};
