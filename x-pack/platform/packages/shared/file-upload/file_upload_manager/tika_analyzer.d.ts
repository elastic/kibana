import type { AnalysisResult, PreviewTikaResponse } from '@kbn/file-upload-common';
import type { FileUploadPluginStartApi } from '@kbn/file-upload-plugin/public/api';
export declare function analyzeTikaFile(data: ArrayBuffer, fileUpload: FileUploadPluginStartApi, signal?: AbortSignal): Promise<{
    standardResults: AnalysisResult;
    tikaResults: PreviewTikaResponse;
}>;
