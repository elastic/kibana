import type { Ensure, SerializableRecord } from '@kbn/utility-types';
import type { MessagePort } from 'worker_threads';
import type { TemplateLayout } from './types';
export interface WorkerData {
    port: MessagePort;
}
export type GenerateReportRequestData = Ensure<{
    layout: TemplateLayout;
    title: string;
    content: SerializableRecord[];
    logo?: string;
}, SerializableRecord>;
export interface GeneratePdfRequest {
    data: GenerateReportRequestData;
}
export interface GeneratePdfData {
    buffer: Uint8Array;
    metrics: {
        pages: number;
    };
}
export declare enum GeneratePdfResponseType {
    Log = 0,
    Data = 1,
    Error = 2
}
interface GeneratePdfLogResponse {
    type: GeneratePdfResponseType.Log;
    data?: GeneratePdfData;
    error?: string;
    message?: string;
}
interface GeneratePdfDataResponse {
    type: GeneratePdfResponseType.Data;
    data?: GeneratePdfData;
    error?: string;
    message?: string;
}
interface GeneratePdfErrorResponse {
    type: GeneratePdfResponseType.Error;
    data?: GeneratePdfData;
    error?: string;
    message?: string;
}
export type GeneratePdfResponse = GeneratePdfLogResponse | GeneratePdfDataResponse | GeneratePdfErrorResponse;
export {};
