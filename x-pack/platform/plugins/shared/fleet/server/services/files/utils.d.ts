interface ParsedFileStorageIndex {
    index: string;
    integration: string;
    type: 'meta' | 'data';
    direction: 'to-host' | 'from-host';
}
/**
 * Given a document index (from either a file's metadata doc or a file's chunk doc), utility will
 * parse it and return information about that index
 * @param index
 */
export declare const parseFileStorageIndex: (index: string) => ParsedFileStorageIndex;
export {};
