import type { CasePostRequest } from '../../../common';
import type { ActionConnector } from '../../../common/types/domain';
import type { CasesConfigurationUI } from '../../containers/types';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
export declare const trimUserFormData: (userFormData: Omit<CaseFormFieldsSchemaProps, "connectorId" | "fields" | "syncAlerts" | "extractObservables" | "customFields" | "templateId" | "templateVersion">) => {
    title: string;
    description: string;
    template?: ({
        id: string;
    } & {
        version?: number | undefined;
    }) | null | undefined;
    tags: string[];
    category?: string | null | undefined;
    severity?: import("../../../common").CaseSeverity | undefined;
    assignees?: {
        uid: string;
    }[] | undefined;
    extended_fields?: {
        [x: string]: string;
    } | undefined;
};
export declare const createFormDeserializer: (data: CasePostRequest) => CaseFormFieldsSchemaProps;
export interface CreateFormSerializerOptions {
    /**
     * When false (templates v2 on + legacy switch off), omit legacy custom fields from the
     * POST payload even if stale values remain in form state.
     */
    includeLegacyCustomFields?: boolean;
}
export declare const createFormSerializer: (connectors: ActionConnector[], currentConfiguration: CasesConfigurationUI, data: CaseFormFieldsSchemaProps, { includeLegacyCustomFields }?: CreateFormSerializerOptions) => CasePostRequest;
export declare const getOwnerDefaultValue: (availableOwners: string[]) => string;
