import type { FunctionCallingMode, OutputAPI } from '@kbn/inference-common';
interface SummarizeDocumentResponse {
    summary: string;
}
export declare const summarizeDocument: ({ searchTerm, documentContent, connectorId, outputAPI, functionCalling, }: {
    searchTerm: string;
    documentContent: string;
    outputAPI: OutputAPI;
    connectorId: string;
    functionCalling?: FunctionCallingMode;
}) => Promise<SummarizeDocumentResponse>;
export {};
