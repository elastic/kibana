export declare function isValidNamespace(namespace: string, allowBlankNamespace?: boolean, allowedNamespacePrefixes?: string[]): {
    valid: boolean;
    error?: string;
};
export declare function isValidDataset(dataset: string, allowBlank?: boolean): {
    valid: boolean;
    error?: string;
};
export declare const INVALID_NAMESPACE_CHARACTERS: RegExp;
