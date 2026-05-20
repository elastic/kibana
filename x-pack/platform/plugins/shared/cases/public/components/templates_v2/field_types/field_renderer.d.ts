import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import type { InlineField } from '../../../../common/types/domain/template/fields';
type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;
export interface TemplateFieldRendererProps {
    parsedTemplate: ParsedTemplateDefinition;
    owner?: string;
    onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
    parentFieldNames?: Set<string>;
    parentTemplateName?: string;
}
export declare const FieldsRenderer: FC<{
    resolvedFields: InlineField[];
    parentFieldNames?: Set<string>;
    parentTemplateName?: string;
    onFieldConfirm?: () => void;
}>;
/**
 * Renders extended fields inside the template YAML editor preview. Owns its
 * own RHF form and bidirectionally syncs with the YAML defaults via
 * useYamlFormSync.
 */
export declare const TemplateFieldRenderer: FC<TemplateFieldRendererProps>;
export {};
