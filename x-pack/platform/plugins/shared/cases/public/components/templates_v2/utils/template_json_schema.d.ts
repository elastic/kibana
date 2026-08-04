import { z } from '@kbn/zod/v4';
/**
 * URI identifier for the template JSON Schema.
 * This is an arbitrary unique identifier used by monaco-yaml to associate
 * the schema with YAML files in the editor.
 * Note: This URI is displayed in Monaco hover tooltips as the schema source.
 */
export declare const TEMPLATE_SCHEMA_URI = "kibana://cases/template-definition-schema";
interface OverrideCtx {
    zodSchema: z.core.$ZodTypes;
    jsonSchema: z.core.JSONSchema.BaseSchema;
    path: (string | number)[];
}
/**
 * Field-level schema overrides shared by every editor that authors field YAML — the template
 * editor (fields inside a template definition) and the field library editor (a standalone field
 * definition). Keeping one pipeline prevents the editors' autocomplete/validation from drifting.
 */
export declare function applyFieldSchemaOverrides(ctx: OverrideCtx): void;
/**
 * Generates the Monaco editor JSON Schema from the Zod definition schema, keeping editor validation
 * in sync with Zod. `settings` and `connector` are omitted: they are panel-owned (edited on the
 * Configuration tab, merged into the definition on save), never part of the editor buffer, so the
 * editor must not autocomplete/suggest them — otherwise a value typed in the Fields YAML would be
 * silently overwritten by the panel state on save. Based on workflows' get_workflow_json_schema.ts.
 */
export declare function getTemplateDefinitionJsonSchema(): z.core.JSONSchema.JSONSchema | null;
export {};
