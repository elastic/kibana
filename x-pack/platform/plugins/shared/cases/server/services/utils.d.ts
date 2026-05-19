import type { Type } from 'io-ts';
export declare const bulkDecodeSOAttributes: <T>(savedObjects: Array<{
    id: string;
    attributes: T;
}>, type: Type<T>) => Map<string, T>;
