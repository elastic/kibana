import type { z } from '@kbn/zod/v4';
/**
 * The intent of the download request.
 */
export declare const DownloadIntent: z.ZodEnum<{
    download: "download";
    install: "install";
}>;
export type DownloadIntent = z.infer<typeof DownloadIntent>;
export type DownloadIntentEnum = typeof DownloadIntent.enum;
export declare const DownloadIntentEnum: {
    download: "download";
    install: "install";
};
export declare const ApproveIntegrationRequest: z.ZodObject<{
    version: z.ZodString;
    categories: z.ZodArray<z.ZodString>;
    langSmithOptions: z.ZodOptional<z.ZodObject<{
        projectName: z.ZodString;
        apiKey: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ApproveIntegrationRequest = z.infer<typeof ApproveIntegrationRequest>;
export declare const ApproveAutoImportIntegrationRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
}, z.core.$strip>;
export type ApproveAutoImportIntegrationRequestParams = z.infer<typeof ApproveAutoImportIntegrationRequestParams>;
export type ApproveAutoImportIntegrationRequestParamsInput = z.input<typeof ApproveAutoImportIntegrationRequestParams>;
export declare const ApproveAutoImportIntegrationRequestBody: z.ZodObject<{
    version: z.ZodString;
    categories: z.ZodArray<z.ZodString>;
    langSmithOptions: z.ZodOptional<z.ZodObject<{
        projectName: z.ZodString;
        apiKey: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ApproveAutoImportIntegrationRequestBody = z.infer<typeof ApproveAutoImportIntegrationRequestBody>;
export type ApproveAutoImportIntegrationRequestBodyInput = z.input<typeof ApproveAutoImportIntegrationRequestBody>;
export declare const CreateAutoImportIntegrationRequestBody: z.ZodObject<{
    connectorId: z.ZodString;
    integrationId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    langSmithOptions: z.ZodOptional<z.ZodObject<{
        projectName: z.ZodString;
        apiKey: z.ZodString;
    }, z.core.$strict>>;
    logo: z.ZodOptional<z.ZodString>;
    dataStreams: z.ZodOptional<z.ZodArray<z.ZodObject<{
        dataStreamId: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        inputTypes: z.ZodArray<z.ZodObject<{
            name: z.ZodEnum<{
                kafka: "kafka";
                tcp: "tcp";
                gcs: "gcs";
                udp: "udp";
                filestream: "filestream";
                http_endpoint: "http_endpoint";
                "gcp-pubsub": "gcp-pubsub";
                "azure-eventhub": "azure-eventhub";
                "aws-s3": "aws-s3";
                "azure-blob-storage": "azure-blob-storage";
                "aws-cloudwatch": "aws-cloudwatch";
                cloudfoundry: "cloudfoundry";
                journald: "journald";
            }>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
}, z.core.$strict>;
export type CreateAutoImportIntegrationRequestBody = z.infer<typeof CreateAutoImportIntegrationRequestBody>;
export type CreateAutoImportIntegrationRequestBodyInput = z.input<typeof CreateAutoImportIntegrationRequestBody>;
export declare const CreateAutoImportIntegrationResponse: z.ZodObject<{
    integration_id: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type CreateAutoImportIntegrationResponse = z.infer<typeof CreateAutoImportIntegrationResponse>;
export declare const DeleteAutoImportIntegrationRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
}, z.core.$strip>;
export type DeleteAutoImportIntegrationRequestParams = z.infer<typeof DeleteAutoImportIntegrationRequestParams>;
export type DeleteAutoImportIntegrationRequestParamsInput = z.input<typeof DeleteAutoImportIntegrationRequestParams>;
export declare const DownloadAutoImportIntegrationRequestQuery: z.ZodObject<{
    intent: z.ZodOptional<z.ZodEnum<{
        download: "download";
        install: "install";
    }>>;
}, z.core.$strip>;
export type DownloadAutoImportIntegrationRequestQuery = z.infer<typeof DownloadAutoImportIntegrationRequestQuery>;
export type DownloadAutoImportIntegrationRequestQueryInput = z.input<typeof DownloadAutoImportIntegrationRequestQuery>;
export declare const DownloadAutoImportIntegrationRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
}, z.core.$strip>;
export type DownloadAutoImportIntegrationRequestParams = z.infer<typeof DownloadAutoImportIntegrationRequestParams>;
export type DownloadAutoImportIntegrationRequestParamsInput = z.input<typeof DownloadAutoImportIntegrationRequestParams>;
export declare const GetAllAutoImportIntegrationsResponse: z.ZodArray<z.ZodObject<{
    integrationId: z.ZodString;
    title: z.ZodString;
    logo: z.ZodOptional<z.ZodString>;
    totalDataStreamCount: z.ZodNumber;
    successfulDataStreamCount: z.ZodNumber;
    version: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodString;
    createdByProfileUid: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        pending: "pending";
        failed: "failed";
        completed: "completed";
        cancelled: "cancelled";
        deleting: "deleting";
        approved: "approved";
        processing: "processing";
    }>;
}, z.core.$strip>>;
export type GetAllAutoImportIntegrationsResponse = z.infer<typeof GetAllAutoImportIntegrationsResponse>;
export declare const GetAutoImportIntegrationRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
}, z.core.$strip>;
export type GetAutoImportIntegrationRequestParams = z.infer<typeof GetAutoImportIntegrationRequestParams>;
export type GetAutoImportIntegrationRequestParamsInput = z.input<typeof GetAutoImportIntegrationRequestParams>;
export declare const GetAutoImportIntegrationResponse: z.ZodObject<{
    integrationResponse: z.ZodObject<{
        integrationId: z.ZodString;
        title: z.ZodString;
        logo: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        connectorId: z.ZodOptional<z.ZodString>;
        createdBy: z.ZodOptional<z.ZodString>;
        createdByProfileUid: z.ZodOptional<z.ZodString>;
        dataStreams: z.ZodArray<z.ZodObject<{
            dataStreamId: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            inputTypes: z.ZodArray<z.ZodObject<{
                name: z.ZodEnum<{
                    kafka: "kafka";
                    tcp: "tcp";
                    gcs: "gcs";
                    udp: "udp";
                    filestream: "filestream";
                    http_endpoint: "http_endpoint";
                    "gcp-pubsub": "gcp-pubsub";
                    "azure-eventhub": "azure-eventhub";
                    "aws-s3": "aws-s3";
                    "azure-blob-storage": "azure-blob-storage";
                    "aws-cloudwatch": "aws-cloudwatch";
                    cloudfoundry: "cloudfoundry";
                    journald: "journald";
                }>;
            }, z.core.$strip>>;
            status: z.ZodEnum<{
                pending: "pending";
                failed: "failed";
                completed: "completed";
                cancelled: "cancelled";
                deleting: "deleting";
                approved: "approved";
                processing: "processing";
            }>;
        }, z.core.$strip>>;
        categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
        status: z.ZodEnum<{
            pending: "pending";
            failed: "failed";
            completed: "completed";
            cancelled: "cancelled";
            deleting: "deleting";
            approved: "approved";
            processing: "processing";
        }>;
    }, z.core.$strip>;
}, z.core.$strict>;
export type GetAutoImportIntegrationResponse = z.infer<typeof GetAutoImportIntegrationResponse>;
export declare const UpdateAutoImportIntegrationRequestParams: z.ZodObject<{
    integration_id: z.ZodString;
}, z.core.$strip>;
export type UpdateAutoImportIntegrationRequestParams = z.infer<typeof UpdateAutoImportIntegrationRequestParams>;
export type UpdateAutoImportIntegrationRequestParamsInput = z.input<typeof UpdateAutoImportIntegrationRequestParams>;
export declare const UpdateAutoImportIntegrationRequestBody: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodString>;
    langSmithOptions: z.ZodOptional<z.ZodObject<{
        projectName: z.ZodString;
        apiKey: z.ZodString;
    }, z.core.$strict>>;
    dataStreams: z.ZodOptional<z.ZodArray<z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        inputTypes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodEnum<{
                kafka: "kafka";
                tcp: "tcp";
                gcs: "gcs";
                udp: "udp";
                filestream: "filestream";
                http_endpoint: "http_endpoint";
                "gcp-pubsub": "gcp-pubsub";
                "azure-eventhub": "azure-eventhub";
                "aws-s3": "aws-s3";
                "azure-blob-storage": "azure-blob-storage";
                "aws-cloudwatch": "aws-cloudwatch";
                cloudfoundry: "cloudfoundry";
                journald: "journald";
            }>;
        }, z.core.$strip>>>;
        rawSamples: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type UpdateAutoImportIntegrationRequestBody = z.infer<typeof UpdateAutoImportIntegrationRequestBody>;
export type UpdateAutoImportIntegrationRequestBodyInput = z.input<typeof UpdateAutoImportIntegrationRequestBody>;
