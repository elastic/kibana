export declare function validateSslPathInput(value: string): string[] | undefined;
export declare function validateSslPathInputSecret(value: string | {
    id: string;
} | undefined): string[] | undefined;
export declare function validateSslPathsCombo(values: string[]): Array<{
    message: string;
    index: number;
}> | undefined;
