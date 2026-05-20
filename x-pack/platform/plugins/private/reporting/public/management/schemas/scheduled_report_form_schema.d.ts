import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { ReportTypeData, ReportTypeId } from '../../types';
export declare const getScheduledReportFormSchema: (validateEmailAddresses: ActionsPublicPluginSetup["validateEmailAddresses"], availableReportTypes?: ReportTypeData[]) => {
    title: {
        type: string;
        label: string;
        validations: {
            validator: (data: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFuncArg<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").FormData, unknown>) => ReturnType<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFunc<any, import("@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types").ERROR_CODE>>;
        }[];
    };
    reportTypeId: {
        type: string;
        label: string;
        defaultValue: ReportTypeId;
        validations: {
            validator: (data: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFuncArg<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").FormData, unknown>) => ReturnType<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFunc<any, import("@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types").ERROR_CODE>>;
        }[];
    };
    startDate: {};
    timezone: {};
    recurringSchedule: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").FormSchema<import("@kbn/response-ops-recurring-schedule-form/types").RecurringSchedule>;
    sendByEmail: {
        type: string;
        label: string;
        defaultValue: boolean;
    };
    emailRecipients: {
        type: string;
        label: string;
        defaultValue: never[];
        validations: ({
            validator: (data: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFuncArg<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").FormData, unknown>) => ReturnType<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFunc<any, import("@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types").ERROR_CODE>>;
            isBlocking?: undefined;
        } | {
            isBlocking: boolean;
            validator: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFunc<Partial<import("../../types").ScheduledReport>, string, string>;
        })[];
    };
    emailCcRecipients: {
        type: string;
        label: string;
        defaultValue: never[];
        validations: {
            isBlocking: boolean;
            validator: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFunc<Partial<import("../../types").ScheduledReport>, string, string>;
        }[];
    };
    emailBccRecipients: {
        type: string;
        label: string;
        defaultValue: never[];
        validations: {
            isBlocking: boolean;
            validator: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFunc<Partial<import("../../types").ScheduledReport>, string, string>;
        }[];
    };
    emailSubject: {
        type: string;
        label: string;
        defaultValue: string;
    };
    emailMessage: {
        type: string;
        label: string;
        defaultValue: string;
    };
};
