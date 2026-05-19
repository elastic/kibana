export interface UseQueryStateOptions<T> {
    defaultValue?: T;
    historyMode?: 'replace' | 'push';
    parse?: (value: T | null) => T;
}
export interface SetQueryStateOptions {
    historyMode?: 'replace' | 'push';
}
export type SetQueryState<T> = (nextValue: T, setOptions?: SetQueryStateOptions) => Promise<void>;
export interface UseQueryState {
    <T>(key: string, options?: UseQueryStateOptions<T> & {
        defaultValue: undefined;
    }): [
        T | null,
        SetQueryState<T | null>
    ];
    <T>(key: string, options?: UseQueryStateOptions<T>): [T, SetQueryState<T>];
}
/**
 * Synchronizes state with URL query parameters.
 * Similar to `useState` but persists state in the URL for deep linking and navigation.
 *
 * @param key - The query parameter key
 * @param options.defaultValue - Default value when no state exists in URL
 * @param options.historyMode - 'replace' or 'push' for URL updates (default: 'replace')
 * @param options.parse - Function to parse the value from the URL
 * @returns [state, setState]
 */
export declare const useQueryState: UseQueryState;
