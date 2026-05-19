import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CasePostRequest } from '../../../common';
import type { ConnectorTypeFields } from '../../../common/types/domain';
export type CaseFormFieldsSchemaProps = Omit<CasePostRequest, 'connector' | 'settings' | 'owner' | 'customFields'> & {
    connectorId: string;
    fields: ConnectorTypeFields['fields'];
    syncAlerts: boolean;
    extractObservables: boolean;
    customFields: Record<string, string | boolean>;
    templateId?: string;
    templateVersion?: number;
    extendedFields?: Record<string, unknown>;
};
export declare const schema: FormSchema<CaseFormFieldsSchemaProps>;
