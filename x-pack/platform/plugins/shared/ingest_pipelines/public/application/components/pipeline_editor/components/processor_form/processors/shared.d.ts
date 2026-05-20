import type { FunctionComponent } from 'react';
import * as rt from 'io-ts';
import type { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import type { FieldConfig, ValidationFunc } from '../../../../../../shared_imports';
export declare const arrayOfStrings: rt.ArrayC<rt.StringC>;
export declare function isArrayOfStrings(v: unknown): v is string[];
/**
 * Shared deserializer functions.
 *
 * These are intended to be used in @link{FieldsConfig} as the "deserializer".
 *
 * Example:
 * {
 *   ...
 *   deserialize: to.booleanOrUndef,
 *   ...
 * }
 *
 */
export declare const to: {
    booleanOrUndef: (v: unknown) => boolean | undefined;
    arrayOfStrings: (v: unknown) => string[];
    jsonString: (v: unknown) => string;
    /**
     * Useful when deserializing strings that will be rendered inside of text areas or text inputs. We want
     * a string like: "my\ttab" to render the same, not to render as "my<tab>tab".
     */
    escapeBackslashes: (v: unknown) => unknown;
    xJsonString: (v: unknown) => string;
};
/**
 * Shared serializer functions.
 *
 * These are intended to be used in @link{FieldsConfig} as the "serializer".
 *
 * Example:
 * {
 *   ...
 *   serializer: from.optionalJson,
 *   ...
 * }
 *
 */
export declare const from: {
    optionalJson: (v: string) => any;
    optionalArrayOfStrings: (v: string[]) => string[] | undefined;
    undefinedIfValue: (value: unknown) => (v: boolean) => boolean | undefined;
    emptyStringToUndefined: (v: unknown) => unknown;
    /**
     * Useful when serializing user input from a <textarea /> that we want to later JSON.stringify but keep the same as what
     * the user input. For instance, given "my\ttab", encoded as "my%5Ctab" will JSON.stringify to "my\\ttab", instead we want
     * to keep the input exactly as the user entered it.
     */
    unescapeBackslashes: (v: unknown) => any;
    optionalXJson: (v: string) => string | undefined;
    optionalXJsonArray: (v: string) => string | undefined;
};
export declare const isJSONStringValidator: ValidationFunc;
export declare const isXJsonField: (message: string, { allowEmptyString }?: {
    allowEmptyString?: boolean;
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;
/**
 * Similar to the emptyField validator but we accept whitespace characters.
 */
export declare const isEmptyString: (message: string) => ValidationFunc;
export declare const EDITOR_PX_HEIGHT: {
    extraSmall: number;
    small: number;
    medium: number;
    large: number;
};
export type FieldsConfig = Record<string, FieldConfig<any>>;
export type FormFieldsComponent = FunctionComponent<{
    initialFieldValues?: Record<string, any>;
}>;
export declare const isXJsonValue: (value: any) => boolean;
