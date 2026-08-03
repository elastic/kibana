import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import type { InlineField } from '../../../../common/types/domain/template/fields';
type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;
export interface TemplateFieldRendererProps {
    parsedTemplate: ParsedTemplateDefinition;
    owner?: string;
    onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
}
/**
 * Builds the initial `extended_fields` form defaults from resolved fields. Display-only fields
 * (e.g. MARKDOWN) hold no form value and are excluded, so they never seed an `extended_fields` key.
 */
export declare const buildInitialDefaultValues: (resolvedFields: InlineField[]) => Record<string, Record<string, string>>;
export declare const FieldsRenderer: FC<{
    resolvedFields: InlineField[];
    onFieldConfirm?: (fieldName: string, fieldType: string) => void;
    savingFieldKey?: string;
}>;
/**
 * Renders extended fields inside the template YAML editor preview. Owns its
 * own RHF form and bidirectionally syncs with the YAML defaults via
 * useYamlFormSync.
 */
export declare const TemplateFieldRenderer: FC<TemplateFieldRendererProps>;
export {};
