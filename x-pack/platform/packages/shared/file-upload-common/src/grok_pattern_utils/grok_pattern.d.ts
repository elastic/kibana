export declare function getFieldsFromGrokPattern(grokPattern: string): {
    name: string;
    type: string;
}[];
export declare function replaceFieldInGrokPattern(grokPattern: string, fieldName: string, index: number): string;
