export interface FileValidationError {
    fileName: string;
    message: string;
}
export interface ValidatedFile {
    file: File;
    documents: unknown[];
}
export interface FileValidationResult {
    validFiles: ValidatedFile[];
    errors: FileValidationError[];
}
export declare const useValidateYaml: () => {
    validateFiles: (files: File[]) => Promise<FileValidationResult>;
};
