import type * as rt from 'io-ts';
type ErrorFactory = (message: string) => Error;
export declare const createPlainError: (message: string) => Error;
export declare const throwBadRequestError: (errors: rt.Errors) => never;
/**
 * This function will throw if a required field is missing or an excess field is present.
 * NOTE: This will only throw for an excess field if the type passed in leverages exact from io-ts.
 */
export declare const decodeWithExcessOrThrow: <A, O, I>(runtimeType: rt.Type<A, O, I>) => (inputValue: I) => A;
/**
 * This function will throw if a required field is missing.
 */
export declare const decodeOrThrow: <A, O, I>(runtimeType: rt.Type<A, O, I>, createError?: ErrorFactory) => (inputValue: I) => A;
export {};
