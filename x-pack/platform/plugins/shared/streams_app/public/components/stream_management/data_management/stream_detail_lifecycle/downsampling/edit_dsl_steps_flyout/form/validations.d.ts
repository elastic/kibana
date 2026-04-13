import type { FormData, ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
type DslValidationFunc<V = unknown> = ValidationFunc<FormData, string, V>;
export declare const requiredAfterValue: DslValidationFunc;
export declare const afterMustBeNonNegative: DslValidationFunc;
export declare const afterMustBeInteger: DslValidationFunc;
export declare const afterGreaterThanPreviousStep: DslValidationFunc;
export declare const afterSmallerThanDataRetention: ({ retentionMs, retentionEsFormat, }: {
    retentionMs: number;
    retentionEsFormat: string;
}) => DslValidationFunc;
export declare const requiredFixedIntervalValue: DslValidationFunc;
export declare const fixedIntervalMustBeGreaterThanZero: DslValidationFunc;
export declare const fixedIntervalMustBeInteger: DslValidationFunc;
export declare const fixedIntervalMustBeAtLeastFiveMinutes: DslValidationFunc;
export declare const fixedIntervalMultipleOfPreviousStep: DslValidationFunc;
export {};
