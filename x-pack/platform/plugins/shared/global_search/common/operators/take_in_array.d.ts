import type { MonoTypeOperatorFunction } from 'rxjs';
/**
 * Emits only the first `count` items from the arrays emitted by the source Observable. The limit
 * is global to all emitted values, and not per emission.
 *
 * @example
 * ```ts
 * const source = of([1, 2], [3, 4], [5, 6]);
 * const takeThreeInArray = source.pipe(takeInArray(3));
 * takeThreeInArray.subscribe(x => console.log(x));
 *
 * // Logs:
 * // [1,2]
 * // [3]
 * ```
 *
 * @param count The total maximum number of value to keep from the emitted arrays
 */
export declare function takeInArray<T>(count: number): MonoTypeOperatorFunction<T[]>;
