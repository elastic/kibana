import type { MlPages } from './locator_ml_pages';
export interface Dictionary<TValue> {
    [id: string]: TValue;
}
export declare function dictionaryToArray<TValue>(dict: Dictionary<TValue>): TValue[];
export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export type DeepReadonly<T> = T extends Array<infer R> ? ReadonlyArray<DeepReadonly<T>> : T extends Function ? T : T extends object ? DeepReadonlyObject<T> : T;
type DeepReadonlyObject<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};
export type AppPageState<T> = {
    [key in MlPages]?: Partial<T>;
};
type Without<T, U> = {
    [P in Exclude<keyof T, keyof U>]?: never;
};
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
export type AwaitReturnType<T> = T extends PromiseLike<infer U> ? U : T;
/**
 * Removes an optional modifier from a property in a type.
 */
export type WithRequired<T, K extends keyof T> = T & {
    [P in K]-?: Exclude<T[P], null>;
};
/**
 * Makes requested properties in a type optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export {};
