import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
export interface LocalStorageLens {
    indexPatternId?: string;
    skipDeleteModal?: boolean;
}
export declare const LOCAL_STORAGE_LENS_KEY = "lens-settings";
export declare const readFromStorage: (storage: IStorageWrapper, key: string) => any;
export declare const writeToStorage: (storage: IStorageWrapper, key: string, value: string) => void;
