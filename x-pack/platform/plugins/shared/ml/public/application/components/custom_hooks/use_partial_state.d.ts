/**
 * Custom hook for partial state update.
 */
export declare function usePartialState<T>(initialValue: T): [T, (update: Partial<T>) => void];
