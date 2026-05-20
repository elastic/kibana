import * as rt from 'io-ts';
import type { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';
type ErrorFactory = (message: string) => Error;
export declare const throwErrors: (createError: ErrorFactory) => (errors: rt.Errors) => never;
export declare const jsonScalarRt: rt.UnionC<[rt.NullC, rt.BooleanC, rt.NumberC, rt.StringC]>;
export declare const jsonValueRt: rt.Type<JsonValue>;
export declare const jsonArrayRt: rt.Type<JsonArray>;
export declare const jsonObjectRt: rt.Type<JsonObject>;
export {};
