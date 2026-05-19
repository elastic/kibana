import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;
/**
 * Merge parent and child template definitions for single-level inheritance.
 * Parent fields come first; child fields with the same name override the parent.
 * The child's own metadata (name, description, tags, etc.) takes precedence.
 * The `extends` key is preserved from the child so the editor round-trip is intact.
 */
export declare const mergeTemplateDefinitions: (parent: ParsedTemplateDefinition, child: ParsedTemplateDefinition) => ParsedTemplateDefinition;
export {};
