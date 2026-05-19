export interface IndexMetadata {
    index?: string | string[];
}
export declare const isIndexMetadata: (metadata: unknown) => metadata is IndexMetadata | null | undefined;
export declare const assertValidIndexMetadata: (metadata: unknown) => void;
export declare const getIndexFromMetadata: (metadata: unknown) => string | string[] | undefined;
