import type { TemplateConfiguration } from '../../../common/types/domain';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
export type TemplateFormProps = Pick<TemplateConfiguration, 'key' | 'name'> & Partial<CaseFormFieldsSchemaProps> & {
    templateTags?: string[];
    templateDescription?: string;
};
