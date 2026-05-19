import type { CustomFieldsConfiguration, CustomFieldTypes, TemplatesConfiguration } from '../../../common/types/domain';
/**
 * Throws an error if the request tries to change the type of existing custom fields.
 */
export declare const validateCustomFieldTypesInRequest: ({ requestCustomFields, originalCustomFields, }: {
    requestCustomFields?: Array<{
        key: string;
        type: CustomFieldTypes;
        label: string;
    }>;
    originalCustomFields: Array<{
        key: string;
        type: CustomFieldTypes;
    }>;
}) => void;
export declare const validateTemplatesCustomFieldsInRequest: ({ templates, customFieldsConfiguration, }: {
    templates?: TemplatesConfiguration;
    customFieldsConfiguration?: CustomFieldsConfiguration;
}) => void;
