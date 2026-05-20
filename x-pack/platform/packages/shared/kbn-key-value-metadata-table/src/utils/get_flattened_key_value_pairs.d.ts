type Maybe<T> = T | null | undefined;
export interface KeyValuePair {
    key: string;
    value: unknown;
}
export declare const getFlattenedKeyValuePairs: (item: Maybe<Record<string, any | any[]>>, parentKey?: string) => KeyValuePair[];
export {};
