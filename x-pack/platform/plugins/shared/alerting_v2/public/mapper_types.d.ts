/**
 * Makes every key of `T` required-*present* in an object literal while keeping
 * the original value types (so `undefined` values are still allowed). Use it as
 * a mapper's return type so that adding a field to the target type fails to
 * compile until the mapper explicitly writes it.
 *
 * Unlike `Required<T>`, this does not strip `undefined` from the value types,
 * which is what lets `per_page: perPage` keep type-checking when `perPage` is
 * optional.
 */
export type Complete<T> = T & Record<keyof T, unknown>;
/**
 * Compile-time guard for a destructured view-state's `...rest`. Passing `rest`
 * forces every source field to be destructured (i.e. considered by the mapper):
 * a newly added field lands in `rest`, which is then no longer assignable to
 * `Record<string, never>` and fails to compile right at the mapper.
 */
export declare const assertAllFieldsMapped: (_rest: Record<string, never>) => void;
