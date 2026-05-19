import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
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
    form: FormHook<{}>;
    parentFieldNames?: Set<string>;
    parentTemplateName?: string;
}>;
/**
 * WARN: this component uses shared-form renderer for Case form compatiblity.
 * Dont change this until we migrate everything to react hook form.
 */
export declare const TemplateFieldRenderer: FC<TemplateFieldRendererProps>;
export {};
