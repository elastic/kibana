import type { z } from '@kbn/zod/v4';
export declare const DeleteDataStreamRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
    data_stream_id: z.ZodString;
}, z.core.$strip>;
export type DeleteDataStreamRequestParams = z.infer<typeof DeleteDataStreamRequestParams>;
export type DeleteDataStreamRequestParamsInput = z.input<typeof DeleteDataStreamRequestParams>;
export declare const GetDataStreamResultsRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
    data_stream_id: z.ZodString;
}, z.core.$strip>;
export type GetDataStreamResultsRequestParams = z.infer<typeof GetDataStreamResultsRequestParams>;
export type GetDataStreamResultsRequestParamsInput = z.input<typeof GetDataStreamResultsRequestParams>;
export declare const GetDataStreamResultsResponse: z.ZodObject<{
    ingest_pipeline: z.ZodString;
    results: z.ZodArray<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strict>;
export type GetDataStreamResultsResponse = z.infer<typeof GetDataStreamResultsResponse>;
export declare const ReanalyzeDataStreamRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
    data_stream_id: z.ZodString;
}, z.core.$strip>;
export type ReanalyzeDataStreamRequestParams = z.infer<typeof ReanalyzeDataStreamRequestParams>;
export type ReanalyzeDataStreamRequestParamsInput = z.input<typeof ReanalyzeDataStreamRequestParams>;
export declare const ReanalyzeDataStreamRequestBody: z.ZodObject<{
    connectorId: z.ZodString;
    langSmithOptions: z.ZodOptional<z.ZodObject<{
        projectName: z.ZodString;
        apiKey: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strip>;
export type ReanalyzeDataStreamRequestBody = z.infer<typeof ReanalyzeDataStreamRequestBody>;
export type ReanalyzeDataStreamRequestBodyInput = z.input<typeof ReanalyzeDataStreamRequestBody>;
export declare const ReanalyzeDataStreamResponse: z.ZodObject<{
    success: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type ReanalyzeDataStreamResponse = z.infer<typeof ReanalyzeDataStreamResponse>;
export declare const StopAutoImportDataStreamRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
    data_stream_id: z.ZodString;
}, z.core.$strip>;
export type StopAutoImportDataStreamRequestParams = z.infer<typeof StopAutoImportDataStreamRequestParams>;
export type StopAutoImportDataStreamRequestParamsInput = z.input<typeof StopAutoImportDataStreamRequestParams>;
export declare const UpdateDataStreamPipelineRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
    data_stream_id: z.ZodString;
}, z.core.$strip>;
export type UpdateDataStreamPipelineRequestParams = z.infer<typeof UpdateDataStreamPipelineRequestParams>;
export type UpdateDataStreamPipelineRequestParamsInput = z.input<typeof UpdateDataStreamPipelineRequestParams>;
export declare const UpdateDataStreamPipelineRequestBody: z.ZodObject<{
    ingest_pipeline: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        processors: z.ZodOptional<z.ZodArray<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
    }, z.core.$catchall<z.ZodUnknown>>]>;
}, z.core.$strict>;
export type UpdateDataStreamPipelineRequestBody = z.infer<typeof UpdateDataStreamPipelineRequestBody>;
export type UpdateDataStreamPipelineRequestBodyInput = z.input<typeof UpdateDataStreamPipelineRequestBody>;
export declare const UpdateDataStreamPipelineResponse: z.ZodObject<{
    ingest_pipeline: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
    results: z.ZodArray<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strict>;
export type UpdateDataStreamPipelineResponse = z.infer<typeof UpdateDataStreamPipelineResponse>;
export declare const UploadSamplesToDataStreamRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
    data_stream_id: z.ZodString;
}, z.core.$strip>;
export type UploadSamplesToDataStreamRequestParams = z.infer<typeof UploadSamplesToDataStreamRequestParams>;
export type UploadSamplesToDataStreamRequestParamsInput = z.input<typeof UploadSamplesToDataStreamRequestParams>;
export declare const UploadSamplesToDataStreamRequestBody: z.ZodObject<{
    samples: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sourceIndex: z.ZodOptional<z.ZodString>;
    originalSource: z.ZodObject<{
        sourceType: z.ZodEnum<{
            index: "index";
            file: "file";
        }>;
        sourceValue: z.ZodString;
    }, z.core.$strip>;
    langSmithOptions: z.ZodOptional<z.ZodObject<{
        projectName: z.ZodString;
        apiKey: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type UploadSamplesToDataStreamRequestBody = z.infer<typeof UploadSamplesToDataStreamRequestBody>;
export type UploadSamplesToDataStreamRequestBodyInput = z.input<typeof UploadSamplesToDataStreamRequestBody>;
export declare const UploadSamplesToDataStreamResponse: z.ZodObject<{
    success: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type UploadSamplesToDataStreamResponse = z.infer<typeof UploadSamplesToDataStreamResponse>;
