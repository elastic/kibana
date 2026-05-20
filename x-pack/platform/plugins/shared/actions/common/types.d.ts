import type { SUB_FEATURE, ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { LicenseType } from '@kbn/licensing-types';
import type { TaskErrorSource } from '@kbn/task-manager-plugin/common';
export type SubFeature = keyof typeof SUB_FEATURE;
export type ActionTypeSource = keyof typeof ACTION_TYPE_SOURCES;
export interface PublicValidatorType {
    schema: {
        parse(value: unknown): unknown;
    };
}
export interface ActionType {
    id: string;
    name: string;
    enabled: boolean;
    enabledInConfig: boolean;
    enabledInLicense: boolean;
    minimumLicenseRequired: LicenseType;
    supportedFeatureIds: string[];
    isSystemActionType: boolean;
    source?: ActionTypeSource;
    subFeature?: SubFeature;
    isDeprecated: boolean;
    allowMultipleSystemActions?: boolean;
    validate?: {
        params: PublicValidatorType;
    };
    description?: string;
    isExperimental?: boolean;
}
export declare enum InvalidEmailReason {
    invalid = "invalid",
    notAllowed = "notAllowed"
}
export interface ValidatedEmail {
    address: string;
    valid: boolean;
    reason?: InvalidEmailReason;
}
declare const ActionTypeExecutorResultStatusValues: readonly ["ok", "error"];
type ActionTypeExecutorResultStatus = (typeof ActionTypeExecutorResultStatusValues)[number];
export interface ActionTypeExecutorResult<Data> {
    actionId: string;
    status: ActionTypeExecutorResultStatus;
    message?: string;
    serviceMessage?: string;
    data?: Data;
    retry?: null | boolean | Date;
    errorSource?: TaskErrorSource;
    errorName?: string;
    errorMeta?: Record<string, unknown>;
}
export type ActionTypeExecutorRawResult<Data> = ActionTypeExecutorResult<Data> & {
    error?: Error;
};
export declare function isActionTypeExecutorResult(result: unknown): result is ActionTypeExecutorResult<unknown>;
export interface ActionsPublicConfigType {
    allowedEmailDomains: string[];
}
export {};
