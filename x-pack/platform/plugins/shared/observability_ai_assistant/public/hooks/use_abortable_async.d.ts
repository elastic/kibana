interface State<T> {
    error?: Error;
    value?: T;
    loading: boolean;
}
export type AbortableAsyncState<T> = (T extends Promise<infer TReturn> ? State<TReturn> : State<T>) & {
    refresh: () => void;
};
export declare function useAbortableAsync<T>(fn: ({}: {
    signal: AbortSignal;
}) => T | Promise<T>, deps: any[], options?: {
    clearValueOnNext?: boolean;
    defaultValue?: () => T;
}): AbortableAsyncState<T>;
export {};
