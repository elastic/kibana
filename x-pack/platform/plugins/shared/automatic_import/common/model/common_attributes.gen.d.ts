import type { z } from '@kbn/zod/v4';
/**
 * The input type object with its settings.
 */
export declare const InputType: z.ZodObject<{
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
}, z.core.$strip>;
export type InputType = z.infer<typeof InputType>;
/**
 * The data stream object with its settings.
 */
export declare const DataStream: z.ZodObject<{
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
}, z.core.$strip>;
export type DataStream = z.infer<typeof DataStream>;
/**
 * The integration object with its settings.
 */
export declare const Integration: z.ZodObject<{
    integrationId: z.ZodString;
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
    logo: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    title: z.ZodString;
}, z.core.$strict>;
export type Integration = z.infer<typeof Integration>;
/**
 * The type of the original source.
 */
export declare const OriginalSourceType: z.ZodEnum<{
    index: "index";
    file: "file";
}>;
export type OriginalSourceType = z.infer<typeof OriginalSourceType>;
export type OriginalSourceTypeEnum = typeof OriginalSourceType.enum;
export declare const OriginalSourceTypeEnum: {
    index: "index";
    file: "file";
};
/**
 * The original source of the samples.
 */
export declare const OriginalSource: z.ZodObject<{
    sourceType: z.ZodEnum<{
        index: "index";
        file: "file";
    }>;
    sourceValue: z.ZodString;
}, z.core.$strip>;
export type OriginalSource = z.infer<typeof OriginalSource>;
/**
 * The status of the task
 */
export declare const TaskStatus: z.ZodEnum<{
    pending: "pending";
    failed: "failed";
    completed: "completed";
    cancelled: "cancelled";
    deleting: "deleting";
    approved: "approved";
    processing: "processing";
}>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskStatusEnum = typeof TaskStatus.enum;
export declare const TaskStatusEnum: {
    pending: "pending";
    failed: "failed";
    completed: "completed";
    cancelled: "cancelled";
    deleting: "deleting";
    approved: "approved";
    processing: "processing";
};
/**
 * The data stream response object with its settings.
 */
export declare const DataStreamResponse: z.ZodObject<{
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
}, z.core.$strip>;
export type DataStreamResponse = z.infer<typeof DataStreamResponse>;
/**
 * The integration response object with its settings.
 */
export declare const IntegrationResponse: z.ZodObject<{
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
export type IntegrationResponse = z.infer<typeof IntegrationResponse>;
/**
 * The integration object with its settings.
 */
export declare const AllIntegrationsResponseIntegration: z.ZodObject<{
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
}, z.core.$strip>;
export type AllIntegrationsResponseIntegration = z.infer<typeof AllIntegrationsResponseIntegration>;
/**
 * The LangSmith options object.
 */
export declare const LangSmithOptions: z.ZodObject<{
    projectName: z.ZodString;
    apiKey: z.ZodString;
}, z.core.$strict>;
export type LangSmithOptions = z.infer<typeof LangSmithOptions>;
