import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type { CasePatchRequest, CaseRequestCustomFields, CasesSearchRequest } from '../../../common/types/api';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import type { TemplatesService } from '../../services/templates';
interface CustomFieldValidationParams {
    requestCustomFields?: CaseRequestCustomFields;
    customFieldsConfiguration?: CustomFieldsConfiguration;
}
export declare const validateCustomFields: (params: CustomFieldValidationParams) => void;
/**
 * Throws if the type doesn't match the configuration.
 */
export declare function validateCustomFieldTypesInRequest({ requestCustomFields, customFieldsConfiguration, }: CustomFieldValidationParams): void;
/**
 * Throws if the key doesn't match the configuration or is missing
 */
export declare const validateCustomFieldKeysAgainstConfiguration: ({ requestCustomFields, customFieldsConfiguration, }: CustomFieldValidationParams) => never[] | undefined;
/**
 * Returns a list of required custom fields missing from the request
 * that don't have a default value configured.
 */
export declare const validateRequiredCustomFields: ({ requestCustomFields, customFieldsConfiguration, }: CustomFieldValidationParams) => void;
export declare const validateExtendedFieldsInRequest: ({ updateReq, originalCase, templatesService, }: {
    updateReq: CasePatchRequest;
    originalCase: CaseSavedObjectTransformed;
    templatesService: TemplatesService;
}) => Promise<void>;
export declare const validateSearchCasesCustomFields: ({ customFieldsConfiguration, customFields, }: {
    customFieldsConfiguration: CustomFieldsConfiguration;
    customFields: CasesSearchRequest["customFields"];
}) => void;
export {};
