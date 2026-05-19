export interface ImportDocMessage {
    message: string;
}
export interface ImportDocTika {
    data: string;
}
export type ImportDoc = ImportDocMessage | ImportDocTika | string | object;
export interface CreateDocsResponse<T extends ImportDoc> {
    success: boolean;
    remainder: number;
    docs: T[];
    error?: any;
}
export declare abstract class FileReaderBase {
    protected _docArray: ImportDoc[];
    protected abstract _createDocs(t: string, isLastPart: boolean): CreateDocsResponse<ImportDoc>;
    read(data: ArrayBuffer): ImportDoc[];
}
