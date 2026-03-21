import type { FileUploadPluginStartApi } from '@kbn/file-upload-plugin/public/api';
export declare class FileSizeChecker {
    private _maxBytes;
    private _fileSize;
    constructor(fileUpload: FileUploadPluginStartApi, file: File);
    isValid(): boolean;
    maxBytes(): number;
    fileSizeFormatted(): string;
    maxFileSizeFormatted(): string;
    fileSizeDiffFormatted(): string;
}
