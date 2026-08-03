type SetLocalStorageItem<T> = (newItem: T | ((prev: T) => T)) => void;
export declare const useCasesLocalStorage: <T>(key: string, initialValue: T) => [T, SetLocalStorageItem<T>];
export {};
