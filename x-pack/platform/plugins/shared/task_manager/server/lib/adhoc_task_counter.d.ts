/**
 * Keeps track of how many tasks have been created.
 *
 * @export
 * @class AdHocTaskCounter
 *
 */
export declare class AdHocTaskCounter {
    /**
     * Gets the number of created tasks.
     */
    get count(): number;
    private _count;
    constructor();
    increment(by?: number): void;
    reset(): void;
}
