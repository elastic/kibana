import * as rt from 'io-ts';
import type { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';
export type { JsonArray, JsonObject, JsonValue };
export declare const jsonScalarRT: rt.UnionC<[rt.NullC, rt.BooleanC, rt.NumberC, rt.StringC]>;
export type JsonScalar = rt.TypeOf<typeof jsonScalarRT>;
export declare const jsonValueRT: rt.Type<JsonValue>;
export declare const jsonArrayRT: rt.Type<JsonArray>;
export declare const jsonObjectRT: rt.Type<JsonObject>;
