import type { CasePostRequest } from '../../../common';
import type { ActionConnector } from '../../../common/types/domain';
import type { CasesConfigurationUI } from '../../containers/types';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
export declare const trimUserFormData: (userFormData: Omit<CaseFormFieldsSchemaProps, "connectorId" | "fields" | "syncAlerts" | "extractObservables" | "customFields">) => {
    title: string;
    description: string;
    tags: string[];
    template?: {
        id: string;
        version: number;
    } | null | undefined;
    severity?: import("../../../common").CaseSeverity | undefined;
    category?: string | null | undefined;
    assignees?: {
        uid: string;
    }[] | undefined;
    templateId?: string | undefined;
    extended_fields?: {
        [x: string]: string;
    } | undefined;
    templateVersion?: number | undefined;
    extendedFields?: Record<string, unknown> | undefined;
};
export declare const createFormDeserializer: (data: CasePostRequest) => CaseFormFieldsSchemaProps;
export declare const createFormSerializer: (connectors: ActionConnector[], currentConfiguration: CasesConfigurationUI, data: CaseFormFieldsSchemaProps) => CasePostRequest;
export declare const getOwnerDefaultValue: (availableOwners: string[]) => string;
