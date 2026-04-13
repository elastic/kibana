interface UseDebouncedCallbackReturn<T extends (...args: any[]) => any> {
    trigger: T;
    cancel: () => void;
}
export declare function useDebouncedCallback<T extends (...args: any[]) => any>(callback: T, delay: number): UseDebouncedCallbackReturn<T>;
export {};
