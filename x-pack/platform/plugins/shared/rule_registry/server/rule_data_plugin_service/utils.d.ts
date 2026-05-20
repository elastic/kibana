export declare const incrementIndexName: (oldIndex: string) => string | undefined;
export declare const joinWith: <T>(separator: string) => (...items: Array<T | null | undefined>) => string;
export declare const joinWithDash: (...items: (string | null | undefined)[]) => string;
