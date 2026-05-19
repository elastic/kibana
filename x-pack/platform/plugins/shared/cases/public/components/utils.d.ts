import type { IconType } from '@elastic/eui';
import type { FieldConfig, ValidationConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ConnectorTypeFields } from '../../common/types/domain';
import { CustomFieldTypes } from '../../common/types/domain';
import type { CasesPublicStartDependencies } from '../types';
import type { CaseActionConnector } from './types';
import type { CasesConfigurationUI, CaseUI, CaseUser, CaseUsers } from '../../common/ui/types';
import type { CaseUserWithProfileInfo } from './user_profiles/types';
export declare const getConnectorById: (id: string, connectors: CaseActionConnector[]) => CaseActionConnector | null;
export declare const connectorDeprecationValidator: (connector: CaseActionConnector) => ReturnType<ValidationConfig["validator"]>;
export declare const getConnectorsFormValidators: ({ connectors, config, }: {
    connectors: CaseActionConnector[];
    config: FieldConfig;
}) => FieldConfig;
/**
 * Fields without a value need to be transformed to null.
 * Passing undefined for a field to the backed will throw an error.
 * Fo that reason, we need to convert empty fields to null.
 */
export declare const getConnectorsFormSerializer: <T extends {
    fields: ConnectorTypeFields["fields"];
}>(data: T) => T;
export declare const convertEmptyValuesToNull: <T>(fields: T | null | undefined) => T | null;
/**
 * We cannot use lodash isEmpty util function
 * because it will return true for primitive values
 * like boolean or numbers
 */
export declare const isEmptyValue: (value: unknown) => boolean;
/**
 * Form html elements do not support null values.
 * For that reason, we need to convert null values to
 * undefined which is supported.
 */
export declare const getConnectorsFormDeserializer: <T extends {
    fields: ConnectorTypeFields["fields"];
}>(data: T) => T;
export declare const getConnectorIcon: (triggersActionsUi: CasesPublicStartDependencies["triggersActionsUi"], type?: string) => IconType;
export declare const isDeprecatedConnector: (connector?: CaseActionConnector) => boolean;
export declare const removeItemFromSessionStorage: (key: string) => void;
export declare const stringifyToURL: (parsedParams: Record<string, string> | URLSearchParams) => string;
export declare const parseURL: (queryString: string) => {
    [k: string]: string;
};
export declare const parseCaseUsers: ({ caseUsers, createdBy, }: {
    caseUsers?: CaseUsers;
    createdBy: CaseUser;
}) => {
    userProfiles: Map<string, UserProfileWithAvatar>;
    reporterAsArray: CaseUserWithProfileInfo[];
};
export declare const convertCustomFieldValue: ({ value, type, }: {
    value: string | number | boolean | null;
    type: CustomFieldTypes;
}) => string | number | boolean | null;
export declare const addOrReplaceField: <T extends {
    key: string;
}>(fields: T[], fieldToAdd: T) => T[];
export declare function removeEmptyFields<T extends Record<string, unknown>>(obj: T): Partial<T>;
export declare const customFieldsFormDeserializer: (customFields?: CaseUI["customFields"]) => Record<string, string | boolean> | null;
export declare const customFieldsFormSerializer: (customFields: Record<string, string | boolean | number | null>, selectedCustomFieldsConfiguration: CasesConfigurationUI["customFields"]) => CaseUI["customFields"];
export declare const scaledMarkdownImages: import("@emotion/react").SerializedStyles;
